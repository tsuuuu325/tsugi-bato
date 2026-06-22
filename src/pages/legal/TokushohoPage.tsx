import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/LocaleProvider';
import { LEGAL } from '@/config/legal';

export function TokushohoPage() {
  const { t } = useI18n();

  const contactRows: { label: string; value: string }[] = LEGAL.useAddressOmission
    ? [{ label: t('legal.tkContact'), value: LEGAL.contactOmissionText }]
    : [
        { label: t('legal.tkAddress'), value: LEGAL.address },
        { label: t('legal.tkPhone'), value: LEGAL.phone },
      ];

  const rows: { label: string; value: string }[] = [
    { label: t('legal.tkSeller'), value: LEGAL.operatorName },
    { label: t('legal.tkRepresentative'), value: LEGAL.representative },
    ...contactRows,
    { label: t('legal.tkEmail'), value: LEGAL.email },
    { label: t('legal.tkPrice'), value: LEGAL.priceLabel },
    { label: t('legal.tkExtraFees'), value: LEGAL.extraFees },
    { label: t('legal.tkPayment'), value: LEGAL.paymentMethods },
    { label: t('legal.tkPaymentTiming'), value: LEGAL.paymentTiming },
    { label: t('legal.tkDelivery'), value: LEGAL.deliveryTiming },
    { label: t('legal.tkCancel'), value: LEGAL.cancelPolicy },
    { label: t('legal.tkRefund'), value: LEGAL.refundPolicy },
  ];

  return (
    <div className="page legal-page">
      <h1 className="page-title">{t('legal.tokushoho')}</h1>
      <p className="page-desc">{t('legal.tokushohoDesc')}</p>

      <div className="card legal-content">
        <table className="tokushoho-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint hint--compact">{t('legal.tkNote')}</p>
      </div>

      <Link to="/pro" className="btn btn-secondary">{t('billing.title')}</Link>
    </div>
  );
}
