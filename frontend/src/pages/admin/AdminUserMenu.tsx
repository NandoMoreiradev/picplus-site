import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  ChevronsUpDown,
  ExternalLink,
  KeyRound,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import type { AuthUser } from '../../lib/types';

const Trigger = styled.button<{ $open: boolean; $rail: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: ${({ $rail }) => ($rail ? '0.45rem 0' : '0.55rem 0.65rem')};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $open, theme }) => ($open ? theme.colors.surfaceHover : 'transparent')};
  border: 1px solid ${({ $open, theme }) => ($open ? theme.colors.borderStrong : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  outline: none;
  position: relative;

  ${({ $rail }) =>
    $rail &&
    `
    justify-content: center;
    border-radius: 50%;
  `}

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primaryBorder};
  }

  .user-text {
    flex: 1;
    min-width: 0;
    display: ${({ $rail }) => ($rail ? 'none' : 'flex')};
    flex-direction: column;
    gap: 0.15rem;
  }

  .user-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-sub {
    font-size: 0.74rem;
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chevron {
    display: ${({ $rail }) => ($rail ? 'none' : 'block')};
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    transition: transform ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};
    ${({ $open }) => $open && `color: inherit; transform: rotate(180deg);`}
  }
`;

const MenuLayer = styled.div<{ $visible: boolean }>`
  position: fixed;
  z-index: 1000;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  max-height: min(420px, calc(100vh - 24px));
  overflow-y: auto;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) => ($visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)')};
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
`;

const MenuHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.65rem 0.7rem;

  .header-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .header-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-email {
    font-size: 0.74rem;
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RoleBadge = styled.span<{ $owner?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: ${({ $owner, theme }) => ($owner ? theme.colors.primarySoft : theme.colors.surfaceHover)};
  color: ${({ $owner, theme }) => ($owner ? theme.colors.primary : theme.colors.textSecondary)};
  border: 1px solid ${({ $owner, theme }) => ($owner ? theme.colors.primaryBorder : theme.colors.border)};
  width: fit-content;
  margin-top: 0.2rem;
`;

const MenuDivider = styled.hr`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  border: 0;
  margin: 0.35rem 0;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.88rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: transparent;
  border: 0;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    transition: color ${({ theme }) => theme.transitions.fast};
  }

  .item-label {
    flex: 1;
  }

  .external-icon {
    opacity: 0.4;
    transition: opacity ${({ theme }) => theme.transitions.fast};
  }

  &:hover {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.dangerSoft : theme.colors.surfaceHover)};
    color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};

    svg {
      color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
    }

    .external-icon {
      opacity: 0.8;
    }
  }

  &.active {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};

    svg {
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

export interface AdminUserMenuProps {
  user: AuthUser;
  rail?: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}

export function AdminUserMenu({ user, rail = false, onLogout, onNavigate }: AdminUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const roleLabel = user.isOwner ? 'Proprietário' : (user.role?.name ?? 'Sem cargo');

  // Close when pathname changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Position calculation
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setVisible(false);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const width = rail ? 250 : Math.max(rect.width, 240);

    if (rail) {
      // In rail mode, float right next to the rail icon
      const left = rect.right + 10;
      const bottom = Math.max(12, window.innerHeight - rect.bottom);
      setStyle({
        position: 'fixed',
        left: `${left}px`,
        bottom: `${bottom}px`,
        width: `${width}px`,
      });
    } else {
      // In normal mode, float directly above the trigger button
      const bottom = window.innerHeight - rect.top + 8;
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      setStyle({
        position: 'fixed',
        left: `${Math.max(12, left)}px`,
        bottom: `${bottom}px`,
        width: `${width}px`,
      });
    }

    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, rail]);

  // Outside click & keyboard listeners
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleResize = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        $rail={rail}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
        title={rail ? `${user.name} (${roleLabel})` : undefined}
      >
        <Avatar key={user.avatarUrl ?? 'none'} src={user.avatarUrl} name={user.name} size={38} />
        <div className="user-text">
          <span className="user-name">{user.name}</span>
          <span className="user-sub">
            {roleLabel} · {user.email}
          </span>
        </div>
        <ChevronsUpDown className="chevron" size={16} aria-hidden />
      </Trigger>

      {open &&
        createPortal(
          <MenuLayer ref={menuRef} style={style} $visible={visible} role="menu" aria-label="Opções do usuário">
            <MenuHeader>
              <Avatar key={user.avatarUrl ?? 'none'} src={user.avatarUrl} name={user.name} size={38} />
              <div className="header-info">
                <span className="header-name">{user.name}</span>
                <span className="header-email">{user.email}</span>
                <RoleBadge $owner={user.isOwner}>
                  {user.isOwner ? <ShieldCheck size={11} aria-hidden /> : <UserIcon size={11} aria-hidden />}
                  {roleLabel}
                </RoleBadge>
              </div>
            </MenuHeader>

            <MenuDivider />

            <MenuItem
              as={NavLink}
              to="/admin/conta"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <KeyRound size={17} aria-hidden />
              <span className="item-label">Minha conta</span>
            </MenuItem>

            <MenuItem
              as="a"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <ExternalLink size={17} aria-hidden />
              <span className="item-label">Ver o site</span>
              <ExternalLink size={12} className="external-icon" aria-hidden />
            </MenuItem>

            <MenuDivider />

            <MenuItem
              type="button"
              role="menuitem"
              $danger
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut size={17} aria-hidden />
              <span className="item-label">Sair</span>
            </MenuItem>
          </MenuLayer>,
          document.body,
        )}
    </>
  );
}
