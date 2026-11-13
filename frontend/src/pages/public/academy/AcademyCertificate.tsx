import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Award, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Section } from '../../../components/ui/Layout';
import { useFetch } from '../../../hooks/useFetch';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { type CertificatePublicData } from '../../../lib/academy';
import { trackEvent } from '../../../lib/analytics';

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;

  @media print {
    display: none;
  }
`;

const CertificateFrame = styled.div`
  background: radial-gradient(circle at top right, rgba(182, 232, 41, 0.14), transparent 55%),
    linear-gradient(145deg, #121212 0%, #1a1a1a 100%);
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 24px;
  padding: clamp(2rem, 5vw, 4rem);
  position: relative;
  overflow: hidden;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.glow};

  .inner-border {
    border: 1px solid rgba(182, 232, 41, 0.32);
    border-radius: 16px;
    padding: clamp(1.75rem, 4vw, 3.25rem);
  }

  .seal {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 2px solid ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    display: grid;
    place-items: center;
    margin: 0 auto 1.25rem auto;
  }

  .eyebrow {
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: clamp(1.8rem, 3.8vw, 2.8rem);
    margin: 0 0 1.25rem 0;
  }

  .student-name {
    font-size: clamp(1.5rem, 3.2vw, 2.35rem);
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    margin: 0.65rem 0;
  }

  .course-title {
    font-size: clamp(1.25rem, 2.4vw, 1.75rem);
    font-weight: 700;
    color: #fff;
    margin: 0.5rem 0 1.5rem 0;
  }

  .footer-grid {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    gap: 1.5rem;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  @media print {
    box-shadow: none;
    border-color: #111;
    background: #fff;
    color: #111;

    h1,
    .course-title,
    .student-name {
      color: #111 !important;
    }
  }
`;

export function AcademyCertificate() {
  const { code = '' } = useParams<{ code: string }>();
  const {
    data: cert,
    loading,
    error,
    reload,
  } = useFetch<CertificatePublicData>(`/academy/certificates/${code}`);

  usePageMeta(
    cert
      ? `Certificado de ${cert.studentName} — PicPlus Academy`
      : 'Verificação de Certificado — PicPlus Academy',
    'Validação pública de certificado oficial emitido pela PicPlus Academy.',
  );

  const trackedCertRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cert || trackedCertRef.current === cert.certificateCode) return;
    trackedCertRef.current = cert.certificateCode;
    trackEvent('view_certificate', {
      course_slug: cert.courseSlug,
      course_title: cert.courseTitle,
      certificate_code: cert.certificateCode,
    });
  }, [cert]);

  if (loading) {
    return (
      <Section>
        <Container>
          <Skeleton $h="460px" $radius="24px" />
        </Container>
      </Section>
    );
  }

  if (error || !cert) {
    return (
      <Section>
        <Container>
          <ErrorState message={error?.message ?? 'Certificado inválido'} onRetry={reload} />
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <TopBar>
          <Link
            to="/academy"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#A3A3A3',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Voltar para a PicPlus Academy
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.14)',
                color: '#22c55e',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={15} /> Certificado Autêntico Verificado
            </span>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                trackEvent('print_certificate', {
                  course_slug: cert.courseSlug,
                  course_title: cert.courseTitle,
                  certificate_code: cert.certificateCode,
                });
                window.print();
              }}
            >
              <Printer size={16} /> Imprimir / Salvar PDF
            </Button>
          </div>
        </TopBar>

        <CertificateFrame>
          <div className="inner-border">
            <div className="seal">
              <Award size={34} />
            </div>
            <div className="eyebrow">PicPlus Academy</div>
            <h1>Certificado de Conclusão</h1>

            <p style={{ color: '#A3A3A3', fontSize: '1rem', margin: 0 }}>
              Certificamos para os devidos fins que
            </p>

            <div className="student-name">{cert.studentName}</div>

            {cert.studentCpfMasked && (
              <p style={{ color: '#A3A3A3', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                CPF: {cert.studentCpfMasked}
              </p>
            )}

            <p style={{ color: '#A3A3A3', fontSize: '1rem', margin: '0.5rem 0 0 0' }}>
              concluiu com êxito o curso de formação
            </p>

            <div className="course-title">{cert.courseTitle}</div>

            <p style={{ color: '#A3A3A3', fontSize: '0.92rem', maxWidth: 580, margin: '0 auto' }}>
              {cert.workloadHours > 0 ? `Carga horária estimada de ${cert.workloadHours}h • ` : ''}
              Emitido em {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
            </p>

            <div className="footer-grid">
              <div>
                <strong style={{ color: '#fff', display: 'block' }}>
                  {cert.instructorName || 'Diretoria PicPlus Academy'}
                </strong>
                <span>Instrutor(a) Responsável</span>
              </div>

              <div>
                <strong style={{ color: '#B6E829', display: 'block' }}>
                  {cert.certificateCode}
                </strong>
                <span>Código de Autenticidade</span>
              </div>
            </div>
          </div>
        </CertificateFrame>
      </Container>
    </Section>
  );
}
