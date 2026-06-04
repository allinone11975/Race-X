/**
 * KYC PAGE — Identity Verification submission form
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Upload, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import RxBadge from '@/components/common/RxBadge';
import { supabase } from '@/db/supabase';

const STATUS_UI = {
  pending:  { icon: Clock,       color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', label: 'Pending Review' },
  verified: { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  label: 'Verified' },
  rejected: { icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',      label: 'Rejected' },
};

export default function KycPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Login required'); setChecking(false); return; }
    const { data } = await supabase.from('kyc_submissions').select('status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (data) { setStatus(data.status as any); setSubmitted(true); }
    setChecking(false);
  };

  const handleSubmit = async () => {
    if (!fullName || !idType || !idNumber) { toast.error('Fill in required fields'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Login required'); return; }
    setLoading(true);
    const { error } = await supabase.from('kyc_submissions').insert({
      user_id: user.id,
      full_name: fullName,
      date_of_birth: dob || null,
      address: address || null,
      id_type: idType,
      id_number: idNumber,
      status: 'pending',
    });
    if (error) { toast.error('Submission failed'); setLoading(false); return; }
    setSubmitted(true);
    setStatus('pending');
    toast.success('KYC submitted! Review within 24h.');
    setLoading(false);
  };

  // Check existing on mount
  useState(() => { checkStatus(); });

  if (submitted && status) {
    const s = STATUS_UI[status];
    const Icon = s.icon;
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
          <RxBadge label="KYC" />
          <h1 className="text-sm font-bold tracking-widest">IDENTITY VERIFICATION</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`text-center p-8 rounded-2xl border ${s.bg} max-w-sm`}>
            <Icon className={`w-16 h-16 mx-auto mb-4 ${s.color}`} />
            <h2 className={`text-xl font-bold ${s.color}`}>{s.label}</h2>
            {status === 'pending' && <p className="text-sm text-muted-foreground mt-2">Your documents are under review. Usually within 24 hours.</p>}
            {status === 'verified' && <p className="text-sm text-muted-foreground mt-2">Your identity has been verified. Full platform access unlocked.</p>}
            {status === 'rejected' && (
              <div>
                <p className="text-sm text-muted-foreground mt-2">Verification failed. Please resubmit with clearer documents.</p>
                <Button onClick={() => { setSubmitted(false); setStatus(null); }} className="mt-4 border border-[#00F2FF]/30 text-[#00F2FF]">Resubmit</Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4" /></button>
        <RxBadge label="KYC" />
        <div>
          <h1 className="text-sm font-bold tracking-widest">IDENTITY VERIFICATION</h1>
          <p className="text-[10px] text-muted-foreground">Required for Creator withdrawals</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-[#00F2FF]/20 bg-white/[0.03] space-y-1 text-sm">
          <div className="flex items-center gap-2 text-[#00F2FF] mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest">SECURE VERIFICATION</span>
          </div>
          <p className="text-xs text-muted-foreground text-pretty">Your data is encrypted and only used for compliance. Documents are never shared with third parties.</p>
        </motion.div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Full Legal Name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As shown on ID" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date of Birth</Label>
            <Input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Country" className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID Type *</Label>
              <Select onValueChange={setIdType}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['Passport', 'National ID', "Driver's License", 'Residence Permit'].map(t => (
                    <SelectItem key={t} value={t.toLowerCase().replace(/\s+/g, '_')}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID Number *</Label>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Document number" className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-dashed border-white/20 flex items-center gap-3 cursor-pointer hover:border-[#00F2FF]/40 transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-white">Upload ID Documents</p>
              <p className="text-[10px] text-muted-foreground">Front + back of ID, selfie holding ID</p>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !fullName || !idType || !idNumber}
            className="w-full bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-[#00F2FF] font-bold">
            {loading ? 'Submitting...' : <><ShieldCheck className="w-4 h-4 mr-2" />Submit for Verification</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
