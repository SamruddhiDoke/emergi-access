import {
  LogIn, LogOut, UserPlus, KeyRound, ShieldCheck, ShieldX, Eye, ScanLine, Clock3, Ban, BadgeCheck, Settings, FileDown, PencilLine, RefreshCcw, UserX, History,
} from 'lucide-react';
import { humanize } from '../../utils/format';

export const AUDIT_ACTIONS = {
  ACCOUNT_REGISTERED: { label: 'Account registered', icon: UserPlus },
  LOGIN_SUCCESS: { label: 'Signed in', icon: LogIn },
  LOGIN_FAILED: { label: 'Sign-in failed', icon: ShieldX },
  LOGIN_OTP_ISSUED: { label: 'Sign-in code issued', icon: KeyRound },
  LOGIN_OTP_FAILED: { label: 'Sign-in code failed', icon: ShieldX },
  LOGOUT: { label: 'Signed out', icon: LogOut },
  PROFILE_UPDATED: { label: 'Profile updated', icon: PencilLine },
  EMERGENCY_ID_REGENERATED: { label: 'Emergency ID regenerated', icon: RefreshCcw },
  PATIENT_IDENTIFIED: { label: 'Patient identified', icon: ScanLine },
  IDENTIFY_FAILED: { label: 'Unrecognised Emergency ID', icon: ShieldX },
  EMERGENCY_ACCESS_REQUESTED: { label: 'Break-glass requested', icon: KeyRound },
  EMERGENCY_ACCESS_DENIED: { label: 'Emergency access denied', icon: ShieldX },
  BREAK_GLASS_OTP_FAILED: { label: 'Break-glass code failed', icon: ShieldX },
  EMERGENCY_ACCESS_GRANTED: { label: 'Emergency access granted', icon: ShieldCheck },
  MEDICAL_INFORMATION_VIEWED: { label: 'Medical information viewed', icon: Eye },
  MEDICAL_INFORMATION_DENIED: { label: 'Medical information refused', icon: ShieldX },
  EMERGENCY_SUMMARY_EXPORTED: { label: 'Summary PDF exported', icon: FileDown },
  EMERGENCY_ACCESS_EXPIRED: { label: 'Authorization expired', icon: Clock3 },
  EMERGENCY_ACCESS_REVOKED: { label: 'Authorization revoked', icon: Ban },
  EMERGENCY_ACCESS_ENDED: { label: 'Authorization ended early', icon: Ban },
  PROFESSIONAL_VERIFIED: { label: 'Professional verified', icon: BadgeCheck },
  PROFESSIONAL_REJECTED: { label: 'Professional rejected', icon: UserX },
  ACCOUNT_STATUS_CHANGED: { label: 'Account status changed', icon: UserX },
  SYSTEM_SETTINGS_UPDATED: { label: 'Settings updated', icon: Settings },
};

export const actionMeta = (a) => AUDIT_ACTIONS[a] || { label: humanize(a), icon: History };
