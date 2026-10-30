import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { OtpInput, DemoOtpNotice } from '../components/OtpInput';
import { formatEmergencyId } from '../features/emergency/ManualEntry';
import { CountdownRing } from '../features/emergency/CountdownRing';
import { cleanMedical } from '../features/patient/MedicalFormSections';
import { StatusBadge } from '../components/ui/Feedback';
import { WithheldNotice } from '../components/medical';
import { formatCountdown, homeForRole } from '../utils/format';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../routes/ProtectedRoute';

describe('Emergency ID entry', () => {
  it('formats typed input into the canonical Emergency ID shape', () => {
    expect(formatEmergencyId('ea7kq2m9xd4tprh3vb')).toBe('EA-7KQ2-M9XD-4TPR-H3VB');
    expect(formatEmergencyId('EA-7KQ2 m9xd')).toBe('EA-7KQ2-M9XD');
    expect(formatEmergencyId('')).toBe('');
  });
});

describe('OtpInput', () => {
  function Harness({ onDone }) {
    const [v, setV] = useState('');
    return <OtpInput value={v} onChange={(x) => { setV(x); if (x.length === 6) onDone(x); }} />;
  }

  it('accepts a pasted six-digit code', () => {
    const onDone = vi.fn();
    render(<Harness onDone={onDone} />);
    fireEvent.paste(screen.getByLabelText('Digit 1'), { clipboardData: { getData: () => '48 29 13' } });
    expect(onDone).toHaveBeenCalledWith('482913');
  });

  it('ignores non-numeric input', () => {
    const onDone = vi.fn();
    render(<Harness onDone={onDone} />);
    fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: 'a' } });
    expect(screen.getByLabelText('Digit 1')).toHaveValue('');
  });

  it('labels simulated delivery clearly', () => {
    render(<DemoOtpNotice code="123456" />);
    expect(screen.getByText(/Simulated delivery/)).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
  });
});

describe('Countdown', () => {
  it('formats remaining time as mm:ss', () => {
    expect(formatCountdown(299.6)).toBe('04:59');
    expect(formatCountdown(-5)).toBe('00:00');
  });

  it('exposes an accessible timer', () => {
    render(<CountdownRing remaining={42} total={300} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName('42 seconds remaining');
    expect(screen.getByText('00:42')).toBeInTheDocument();
  });
});

describe('Medical form payload', () => {
  it('turns blank optional fields into nulls and years into numbers', () => {
    const out = cleanMedical({
      bloodGroup: '',
      allergies: [{ allergen: 'Latex', reaction: '', severity: 'MILD' }],
      conditions: [{ name: 'Asthma', severity: 'MAJOR', category: 'RESPIRATORY', diagnosedYear: '2010', notes: '' }],
      medications: [{ name: 'Salbutamol', dosage: '', frequency: '', category: 'RESPIRATORY', isCritical: undefined, alertNote: '' }],
      alerts: [],
      history: [{ title: 'Surgery', category: 'GENERAL', year: '', notes: '' }],
    });
    expect(out.bloodGroup).toBeNull();
    expect(out.allergies[0].reaction).toBeNull();
    expect(out.conditions[0].diagnosedYear).toBe(2010);
    expect(out.medications[0].isCritical).toBe(false);
    expect(out.history[0].year).toBeNull();
  });
});

describe('Status and disclosure UI', () => {
  it('conveys status with text, not colour alone', () => {
    render(<StatusBadge status="REVOKED" />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('lists categories withheld from the clinician', () => {
    render(<WithheldNotice categories={['Medical history', 'Current medications']} />);
    expect(screen.getByText('Withheld for your role')).toBeInTheDocument();
    expect(screen.getByText('Medical history')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  const renderAt = (path, roles) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute roles={roles} />}>
            <Route path="/admin" element={<p>admin area</p>} />
          </Route>
          <Route path="/patient" element={<p>patient area</p>} />
          <Route path="/pro/login" element={<p>professional login</p>} />
          <Route path="/login" element={<p>patient login</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('sends signed-out users to the right login', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/admin', ['ADMIN']);
    expect(screen.getByText('professional login')).toBeInTheDocument();
  });

  it('redirects a signed-in user away from another role’s portal', () => {
    useAuth.mockReturnValue({ user: { role: 'PATIENT' }, loading: false });
    renderAt('/admin', ['ADMIN']);
    expect(screen.getByText('patient area')).toBeInTheDocument();
    expect(homeForRole('PARAMEDIC')).toBe('/pro');
  });
});
