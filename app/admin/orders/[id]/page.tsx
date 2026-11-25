"use client";

import { Button, Input, Space, message } from "antd";
import { ArrowLeftRight, Download, Landmark, Receipt, Undo2 } from "lucide-react";
import { ConsolePageShell, Pill } from "@/app/admin/_components/console-list";
import { DetailGrid, DetailItem, DetailSection } from "@/app/admin/_components/console-detail";
import { OrderStatusPill } from "../order-status";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { maskEmail, maskPhoneNumber } from "@/app/admin/users/helpers";
import { EditPageShell } from "@/app/components/PageLoader";
import { EZPREP_PROXY_PREFIX } from "@/app/services/ezprep-api/config";
import {
  formatEzPrepError,
  formatPaiseAsRupees,
  ordersApi,
  type AdminOrderDetail,
  type AdminOrderTax,
  type OrderStatus,
} from "@/app/services/ezprep-api";


const REFUND_CONFIRM_TITLE = "Refund this order?";
const REFUND_CONFIRM_CONTENT =
  "This refunds the full amount and revokes access granted by this order. It does not change the tax invoice.";
const REFUND_COMPLETED_MESSAGE = "Order refunded";
const REFUND_PENDING_MESSAGE =
  "Refund is pending at the payment provider. Access was not revoked.";

export default function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [orderNumberConfirm, setOrderNumberConfirm] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersApi.get(params.id);
      setOrder(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load order"));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmRefund = () => {
    const trimmed = reason.trim();
    if (!order || !trimmed || orderNumberConfirm !== order.orderNumber) {
      return;
    }
    showConfirmModal({
      title: REFUND_CONFIRM_TITLE,
      content: REFUND_CONFIRM_CONTENT,
      onConfirm: () => {
        void (async () => {
          setRefunding(true);
          try {
            const result = await ordersApi.refund(params.id, { reason: trimmed });
            setOrder(result.data.order);
            if (result.data.refund.status === "INITIATED") {
              message.warning(result.message || REFUND_PENDING_MESSAGE);
            } else {
              message.success(result.message || REFUND_COMPLETED_MESSAGE);
            }
          } catch (error) {
            message.error(formatEzPrepError(error, "Failed to refund order"));
          } finally {
            setRefunding(false);
          }
        })();
      },
    });
  };

  const retryProvisioning = () => {
    void (async () => {
      setRepairing(true);
      try {
        const result = await ordersApi.repair(params.id);
        setOrder(result.data);
        message.success(result.message || "Order repaired successfully");
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to retry provisioning"));
      } finally {
        setRepairing(false);
      }
    })();
  };

  const refundReady =
    Boolean(reason.trim()) && orderNumberConfirm === order?.orderNumber;
  const buyerEmail = maskEmail(order?.user?.email);
  const buyerPhone = maskPhoneNumber(order?.user?.phoneNumber);
  const showRepair =
    order != null &&
    order.status === "PAID" &&
    (order.provisionedAt === null || !order.invoice);

  return (
    <EditPageShell loading={loading}>
      {order ? (
        <ConsolePageShell
          eyebrow="Commerce · Order"
          title={order.orderNumber}
          back={{ label: "Back to Orders", onClick: () => router.push("/admin/orders") }}
          badge={
            <span className="flex flex-wrap items-center gap-2">
              <OrderStatusPill status={order.status as OrderStatus} />
              {order.redundantPurchase ? <Pill tone="amber">Redundant purchase</Pill> : null}
              {order.refund?.initiatedBySource === "PROVIDER" ? (
                <Pill tone="orange">External refund</Pill>
              ) : null}
            </span>
          }
          actions={
            showRepair ? (
              <Button type="primary" size="large" loading={repairing} onClick={retryProvisioning}>
                Retry provisioning
              </Button>
            ) : null
          }
        >
          <DetailSection title="Order" icon={Receipt} tone="green">
            <DetailGrid>
              <DetailItem label="Amount">{formatPaiseAsRupees(order.amount)}</DetailItem>
              <DetailItem label="Payment">
                {order.payment ? `${order.payment.status} · ${order.payment.provider}` : "—"}
              </DetailItem>
              <DetailItem label="Name">{order.user?.name?.trim() || "Unknown user"}</DetailItem>
              <DetailItem label="Email">{buyerEmail || "—"}</DetailItem>
              <DetailItem label="Phone">{buyerPhone || "—"}</DetailItem>
              {order.user?.username ? (
                <DetailItem label="Username">{order.user.username}</DetailItem>
              ) : null}
              {order.invoice ? (
                <DetailItem label="Invoice">
                  <a
                    href={`${EZPREP_PROXY_PREFIX}/v1/admin/invoices/${order.invoice.id}/pdf`}
                    className="inline-flex items-center gap-1.5 text-console-green underline decoration-console-green/40 underline-offset-4 hover:text-console-ink-hover"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    Download invoice
                  </a>
                  <span className="ml-1 font-normal text-console-muted">
                    ({order.invoice.invoiceNumber})
                  </span>
                </DetailItem>
              ) : null}
              {order.refund ? (
                <DetailItem label="Refund">
                  {order.refund.status}
                  {order.refund.providerRefundId ? ` · ${order.refund.providerRefundId}` : ""}
                </DetailItem>
              ) : null}
              {order.lateCaptureAt ? (
                <DetailItem label="Late capture">
                  {new Date(order.lateCaptureAt).toLocaleString("en-IN")}
                </DetailItem>
              ) : null}
            </DetailGrid>
          </DetailSection>

          {(order.duplicatePayments ?? []).length > 0 ? (
            <DetailSection title="Duplicate payments" icon={ArrowLeftRight} tone="amber">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {(order.duplicatePayments ?? []).map((payment) => (
                  <li
                    key={payment.id}
                    className="break-words rounded-xl bg-[#F5F2EC] px-4 py-3 text-[14px] text-console-ink"
                  >
                    {payment.providerPaymentId || payment.id} · {payment.status} · refund{" "}
                    {payment.refundStatus ?? "none"}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          {order.tax ? <TaxBlock order={order} /> : null}

          {order.status === "PAID" && order.refund?.status !== "INITIATED" ? (
            <DetailSection title="Refund" icon={Undo2} tone="rose">
              <p className="m-0 mb-4 text-[14.5px] text-console-muted">
                Refunds the full amount. Type the order number to confirm.
              </p>
              <Space direction="vertical" className="w-full max-w-xl">
                <Input.TextArea
                  rows={3}
                  value={reason}
                  maxLength={500}
                  placeholder="Reason for this full refund"
                  onChange={(event) => setReason(event.target.value)}
                />
                <Input
                  value={orderNumberConfirm}
                  placeholder="Type the order number"
                  onChange={(event) => setOrderNumberConfirm(event.target.value)}
                />
                <Button
                  danger
                  type="primary"
                  loading={refunding}
                  disabled={!refundReady}
                  onClick={confirmRefund}
                >
                  Refund
                </Button>
              </Space>
            </DetailSection>
          ) : null}
        </ConsolePageShell>
      ) : null}
    </EditPageShell>
  );
}

function TaxBlock({ order }: { order: AdminOrderDetail }) {
  const tax = order.tax;
  if (!tax) return null;
  const buyerCode = tax.buyerStateCode || order.billing?.stateCode;
  const buyerName = order.billing?.state;
  const buyer =
    buyerName && buyerCode
      ? `${buyerName} (${buyerCode})`
      : buyerCode || buyerName || "—";
  return (
    <DetailSection title="GST" icon={Landmark} tone="violet">
      <DetailGrid>
        <DetailItem label="Taxable">{formatPaiseAsRupees(tax.taxableAmount)}</DetailItem>
        <DetailItem label="CGST">{formatPaiseAsRupees(tax.cgst)}</DetailItem>
        <DetailItem label="SGST">{formatPaiseAsRupees(tax.sgst)}</DetailItem>
        <DetailItem label="IGST">{formatPaiseAsRupees(tax.igst)}</DetailItem>
        <DetailItem label="Rate">{`${tax.taxRate}%`}</DetailItem>
        <DetailItem label="Supply type">{supplyTypeLabel(tax)}</DetailItem>
        <DetailItem label="Buyer state">{buyer}</DetailItem>
      </DetailGrid>
    </DetailSection>
  );
}

function supplyTypeLabel(tax: AdminOrderTax): string {
  const supplyType =
    tax.supplyType ?? (tax.igst > 0 ? "INTER_STATE" : "INTRA_STATE");
  return supplyType === "INTER_STATE" ? "Inter-state" : "Intra-state";
}
