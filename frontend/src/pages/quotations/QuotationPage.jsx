import { useState, useRef, useCallback } from 'react';
import {
  RiDownloadLine, RiAddLine, RiDeleteBinLine, RiImageAddLine,
  RiCloseLine, RiFilePdf2Line, RiDragMove2Line, RiSaveLine,
  RiPrinterLine, RiArrowUpLine, RiArrowDownLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import defaultLogoImg from '../../assets/qutation image.jpeg';


// ── Predefined Plans ─────────────────────────────────────────────────────────
const PRESET_PLANS = [
  { id: 'starter', name: 'Starter Plan', description: 'Basic CRM features for small teams', price: 999, unit: 'month' },
  { id: 'growth', name: 'Growth Plan', description: 'Advanced features + 5 users', price: 2499, unit: 'month' },
  { id: 'pro', name: 'Pro Plan', description: 'Full features + 20 users + support', price: 4999, unit: 'month' },
  { id: 'enterprise', name: 'Enterprise Plan', description: 'Unlimited users + dedicated support', price: 9999, unit: 'month' },
  { id: 'setup', name: 'Setup & Onboarding', description: 'One-time implementation & training', price: 15000, unit: 'one-time' },
  { id: 'support', name: 'Priority Support', description: 'Dedicated account manager', price: 1499, unit: 'month' },
  { id: 'custom', name: 'Custom Development', description: 'Per hour custom module development', price: 1500, unit: 'hour' },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

const fmt = (n, symbol) =>
  `${symbol}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayStr = () => new Date().toISOString().split('T')[0];
const validityStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const newItem = () => ({
  id: Date.now() + Math.random(),
  description: '', qty: 1, unit: '', rate: 0, discount: 0,
  get amount() { return this.qty * this.rate * (1 - this.discount / 100); }
});

// ─────────────────────────────────────────────────────────────────────────────
const QuotationPage = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('quotations', 'quotations-list', 'canCreate');
  const canExport = hasPermission('quotations', 'quotations-list', 'canCreate') ||
    hasPermission('quotations', 'quotation-export', 'canCreate');

  // Company info — default logo pre-loaded from assets
  const [logo, setLogo] = useState(defaultLogoImg);

  const [companyName, setCompanyName] = useState('The First Step Solutions');
  const [companyAddress, setCompanyAddress] = useState('Flat No. 27, 1st Street, Kothari Nagar,\nAnnai Sathya Nagar Main Road,\nRamapuram, Chennai 600089');
  const [companyPhone, setCompanyPhone] = useState('+91 44 3153 6968, 9344983802');
  const [companyEmail, setCompanyEmail] = useState('hello@thefirststepsolutions.com');
  const [companyGST, setCompanyGST] = useState('33CBNPK3375G1ZJ');
  const [companyWebsite, setCompanyWebsite] = useState('www.thefirststepsolutions.com');

  // Client info
  const [clientName, setClientName] = useState('Dear Sir,');
  const [clientCompany, setClientCompany] = useState('M/s. IFAFEA');
  const [clientAddress, setClientAddress] = useState('India');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Salutation and opening text
  const [salutation, setSalutation] = useState('Dear Sir,');
  const [greetings, setGreetings] = useState('Greetings and warm wishes for the season');
  const [openingText, setOpeningText] = useState('At the outset we thank you for the opportunity to organise our services to your esteemed organisation. In continuation to the discussions regarding the Seafood Bharat Expo 2026 at Chennai. We are pleased to present herewith our quote for the same.');

  // Bank details
  const [bankName, setBankName] = useState('Axis');
  const [bankBranch, setBankBranch] = useState('Chinmaya Nagar');
  const [bankAccNo, setBankAccNo] = useState('923020018036099');
  const [bankIFSC, setBankIFSC] = useState('UTIB0003450');

  // Quotation meta
  const [quoteNo, setQuoteNo] = useState(`QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [quoteDate, setQuoteDate] = useState(todayStr());
  const [validUntil, setValidUntil] = useState(validityStr());
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState(18);
  const [globalDiscount, setGlobalDiscount] = useState(7.643); // Matches 28550 discount on 373550 total (approx 7.643%)
  const [notes, setNotes] = useState('Artwork (With high resolution CDR/AI) has to be provided by the client\nAll the materials are rented to the client.\nElectricity during the construction and Exhibition of the stall to be provided by the client');
  const [terms, setTerms] = useState('60% Payment has to be paid as an advance at the time of confirmation and remaining 40% of first day of exhibition.');

  // Line items
  const [items, setItems] = useState([
    { id: 1, description: 'Raised platform', qty: 1, unit: '23ft x 20ft - 460 sqft', rate: 34500, discount: 0 },
    { id: 2, description: 'Pergolo flooring', qty: 1, unit: '23ft x 20ft - 460 sqft', rate: 55200, discount: 0 },
    { id: 3, description: 'Backwall - Woodenply framing with flex finish', qty: 1, unit: '20ft x 8ft - 160 sqft', rate: 22400, discount: 0 },
    { id: 4, description: 'Front & side fascia structure along with supporting structure', qty: 1, unit: '', rate: 48000, discount: 0 },
    { id: 5, description: 'Double sided backlit posters on left & right side along with supporting structure', qty: 1, unit: '2.5ft x 4ft - 2 nos', rate: 40000, discount: 0 },
    { id: 6, description: 'Double sided backlit posters on front side along with supporting structure', qty: 1, unit: '2.5ft x 4ft - 2 nos', rate: 20000, discount: 0 },
    { id: 7, description: 'Backlit posters on backwall', qty: 1, unit: '2.5ft x 4ft - 2 nos', rate: 15000, discount: 0 },
    { id: 8, description: 'Pelmet on backwall & sidewall with paint finish', qty: 1, unit: '', rate: 12000, discount: 0 },
    { id: 9, description: 'LED Tv for 3 days', qty: 1, unit: '55 inches - 2nos', rate: 21000, discount: 0 },
    { id: 10, description: 'Reception table with bar stool', qty: 1, unit: '', rate: 9500, discount: 0 },
    { id: 11, description: 'Double Seater sofa with tpa', qty: 1, unit: '3 nos', rate: 18000, discount: 0 },
    { id: 12, description: 'Round Table', qty: 1, unit: '2 nos', rate: 5850, discount: 0 },
    { id: 13, description: 'Chair', qty: 1, unit: '8 nos', rate: 3600, discount: 0 },
    { id: 14, description: 'Printing charges - Logos & posters', qty: 1, unit: '', rate: 22000, discount: 0 },
    { id: 15, description: 'Electrical & lighting charges', qty: 1, unit: '', rate: 26000, discount: 0 },
    { id: 16, description: 'Profile lightings', qty: 1, unit: '', rate: 14500, discount: 0 },
    { id: 17, description: 'Transportation charges', qty: 1, unit: '', rate: 6000, discount: 0 }
  ]);

  // UI state
  const [signature, setSignature] = useState(null);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [draggingSignature, setDraggingSignature] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'preview'

  const logoInputRef = useRef();
  const signatureInputRef = useRef();
  const previewRef = useRef();

  const currencyObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  // ── Calculations ───────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.rate) * (1 - Number(i.discount) / 100)), 0);
  const discountAmt = subtotal * (Number(globalDiscount) / 100);
  const taxableAmt = subtotal - discountAmt;
  const taxAmt = taxableAmt * (Number(taxRate) / 100);
  const grandTotal = taxableAmt + taxAmt;

  // ── Logo handling ──────────────────────────────────────────────────────────
  const handleLogoFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file (PNG, JPG, etc.)');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    const reader = new FileReader();
    reader.onload = (e) => setLogo(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleSignatureFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file (PNG, JPG, etc.)');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    const reader = new FileReader();
    reader.onload = (e) => setSignature(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  // ── Item CRUD ──────────────────────────────────────────────────────────────
  const addItem = () => setItems(p => [...p, { id: Date.now(), description: '', qty: 1, unit: '', rate: 0, discount: 0 }]);
  const removeItem = (id) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id, field, value) => setItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));
  const moveItem = (idx, dir) => {
    const next = [...items];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setItems(next);
  };
  const addPlan = (plan) => {
    setItems(p => [...p, { id: Date.now(), description: `${plan.name} — ${plan.description}`, qty: 1, unit: plan.unit, rate: plan.price, discount: 0 }]);
    setShowPlanPicker(false);
    toast.success(`"${plan.name}" added to quotation`);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    setActiveTab('preview');
    await new Promise(r => setTimeout(r, 300)); // let preview render

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const el = previewRef.current;
      if (!el) { toast.error('Preview not ready'); setExporting(false); return; }

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;

      let imgW = pageW;
      let imgH = pageW * ratio;

      // Force single page: if calculated height exceeds page height, scale it down to fit
      if (imgH > pageH) {
        imgH = pageH;
        imgW = pageH / ratio;
      }

      // Center the image horizontally
      const xOffset = (pageW - imgW) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 0, imgW, imgH);

      pdf.save(`${quoteNo || 'quotation'}.pdf`);
      toast.success('PDF exported successfully on a single page!');
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
    setExporting(false);
  };

  // ── Input style ────────────────────────────────────────────────────────────
  const inp = {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text-primary)', fontSize: '0.8125rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
  };
  const label = { display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiFilePdf2Line style={{ color: 'var(--accent)' }} /> Quotation Builder
          </h1>
          <p className="page-subtitle">Create professional quotations and export to PDF</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn btn-sm ${activeTab === 'form' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('form')}
          >Form</button>
          <button
            className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('preview')}
          ><RiPrinterLine /> Preview</button>
          {canExport && (
            <button className="btn btn-primary" onClick={exportPDF} disabled={exporting} id="export-pdf-btn">
              {exporting ? <><div className="spinner spinner-sm" /> Exporting...</> : <><RiDownloadLine /> Export PDF</>}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'form' ? '1fr' : '1fr', gap: 20 }}>
        {/* ── FORM PANEL ────────────────────────────────────────────────────── */}
        {activeTab === 'form' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* LEFT: Company + Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Company Info Card */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏢 Your Company Info
                </div>

                {/* Logo Drop Zone */}
                <div
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDraggingLogo(true); }}
                  onDragLeave={() => setDraggingLogo(false)}
                  onDrop={e => { e.preventDefault(); setDraggingLogo(false); handleLogoFile(e.dataTransfer.files[0]); }}
                  style={{
                    border: `2px dashed ${draggingLogo ? 'var(--accent)' : logo ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 10, padding: logo ? '8px' : '24px 16px', textAlign: 'center',
                    cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s',
                    background: draggingLogo ? 'rgba(129,140,248,0.05)' : 'transparent',
                    position: 'relative'
                  }}
                >
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoFile(e.target.files[0])} />
                  {logo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={logo} alt="logo" style={{ height: 50, maxWidth: 120, objectFit: 'contain', borderRadius: 4 }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>Logo uploaded ✓</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to change</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setLogo(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}><RiCloseLine /></button>
                    </div>
                  ) : (
                    <>
                      <RiImageAddLine style={{ fontSize: '2rem', color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Drop PNG/JPG logo here</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>or click to browse · Max 2MB</div>
                    </>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={label}>Company Name</label>
                    <input style={inp} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your Company Pvt Ltd" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={label}>Address</label>
                    <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123, Street, City, State - 600001" />
                  </div>
                  <div>
                    <label style={label}>Phone</label>
                    <input style={inp} value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div>
                    <label style={label}>Email</label>
                    <input style={inp} value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="hello@company.com" />
                  </div>
                  <div>
                    <label style={label}>Website</label>
                    <input style={inp} value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="www.company.com" />
                  </div>
                  <div>
                    <label style={label}>GST / Tax Number</label>
                    <input style={inp} value={companyGST} onChange={e => setCompanyGST(e.target.value)} placeholder="27AABCU9603R1ZX" />
                  </div>
                </div>
              </div>

              {/* Client Info Card */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                  👤 Bill To (Client)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>Contact Name</label>
                    <input style={inp} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div>
                    <label style={label}>Company Name</label>
                    <input style={inp} value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Client Corp" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={label}>Address</label>
                    <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Client address..." />
                  </div>
                  <div>
                    <label style={label}>Email</label>
                    <input style={inp} value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
                  </div>
                  <div>
                    <label style={label}>Phone</label>
                    <input style={inp} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
              </div>

              {/* Opening Greetings Card */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                  ✉️ Salutation & Opening Text
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={label}>Salutation</label>
                    <input style={inp} value={salutation} onChange={e => setSalutation(e.target.value)} placeholder="Dear Sir," />
                  </div>
                  <div>
                    <label style={label}>Greetings</label>
                    <input style={inp} value={greetings} onChange={e => setGreetings(e.target.value)} placeholder="Greetings and warm wishes..." />
                  </div>
                  <div>
                    <label style={label}>Opening Paragraph</label>
                    <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={openingText} onChange={e => setOpeningText(e.target.value)} placeholder="Enter opening text..." />
                  </div>
                </div>
              </div>

              {/* Bank Account Details Card */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                  🏦 Bank Account Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>Bank Name</label>
                    <input style={inp} value={bankName} onChange={e => setBankName(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Branch</label>
                    <input style={inp} value={bankBranch} onChange={e => setBankBranch(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Account Number</label>
                    <input style={inp} value={bankAccNo} onChange={e => setBankAccNo(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>IFSC Code</label>
                    <input style={inp} value={bankIFSC} onChange={e => setBankIFSC(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Quote Details + Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quote Meta */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 16, color: 'var(--text-primary)' }}>
                  📋 Quotation Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={label}>Quotation No.</label>
                    <input style={inp} value={quoteNo} onChange={e => setQuoteNo(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Currency</label>
                    <select style={inp} value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Quote Date</label>
                    <input style={inp} type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Valid Until</label>
                    <input style={inp} type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Tax Rate (%)</label>
                    <input style={inp} type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Global Discount (%)</label>
                    <input style={inp} type="number" min="0" max="100" value={globalDiscount} onChange={e => setGlobalDiscount(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Plan Picker */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    📦 Add Plans / Items
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => setShowPlanPicker(!showPlanPicker)}>
                    {showPlanPicker ? 'Hide Plans' : 'Browse Plans'}
                  </button>
                </div>

                {/* Plan Picker Grid */}
                {showPlanPicker && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {PRESET_PLANS.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => addPlan(plan)}
                        style={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 2 }}>{plan.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{plan.description}</div>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--success)' }}>
                          {currencyObj.symbol}{plan.price.toLocaleString()}<span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{plan.unit}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Line Items Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', width: '42%' }}>Description</th>
                        <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', width: '12%' }}>Size</th>
                        <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', width: '14%' }}>Rate</th>
                        <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', width: '9%' }}>Disc%</th>
                        <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', width: '14%' }}>Amount</th>
                        <th style={{ width: '9%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const amt = Number(item.qty) * Number(item.rate) * (1 - Number(item.discount) / 100);
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(129,140,248,0.05)' }}>
                            <td style={{ padding: '4px 4px' }}>
                              <input style={{ ...inp, padding: '6px 8px', fontSize: '0.775rem' }} value={item.description}
                                onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Item description..." />
                            </td>
                            <td style={{ padding: '4px 4px' }}>
                              <input style={{ ...inp, padding: '6px 8px', textAlign: 'center', fontSize: '0.775rem' }} value={item.unit}
                                onChange={e => updateItem(item.id, 'unit', e.target.value)} placeholder="e.g. 6m x 3m" />
                            </td>
                            <td style={{ padding: '4px 4px' }}>
                              <input style={{ ...inp, padding: '6px 8px', textAlign: 'right', fontSize: '0.775rem' }} type="number" min="0" value={item.rate}
                                onChange={e => updateItem(item.id, 'rate', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px 4px' }}>
                              <input style={{ ...inp, padding: '6px 8px', textAlign: 'center', fontSize: '0.775rem' }} type="number" min="0" max="100" value={item.discount}
                                onChange={e => updateItem(item.id, 'discount', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px 4px', color: 'var(--success)', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {fmt(amt, currencyObj.symbol)}
                            </td>
                            <td style={{ padding: '4px 4px' }}>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 2 }}><RiArrowUpLine /></button>
                                <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 2 }}><RiArrowDownLine /></button>
                                <button onClick={() => removeItem(item.id)} disabled={items.length === 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.9rem', padding: 2 }}><RiDeleteBinLine /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button className="btn btn-sm btn-outline" onClick={addItem} style={{ marginTop: 10 }}>
                  <RiAddLine /> Add Item
                </button>

                {/* Totals */}
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      <span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(subtotal, currencyObj.symbol)}</span>
                    </div>
                    {globalDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, fontSize: '0.8125rem', color: 'var(--warning)' }}>
                        <span>Discount ({globalDiscount}%)</span><span>- {fmt(discountAmt, currencyObj.symbol)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      <span>Tax ({taxRate}%)</span><span>{fmt(taxAmt, currencyObj.symbol)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                      <span>Total</span><span style={{ color: 'var(--success)' }}>{fmt(grandTotal, currencyObj.symbol)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 14, color: 'var(--text-primary)' }}>📝 Notes, Terms & Signature</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={label}>Notes to Client</label>
                    <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Terms & Conditions</label>
                    <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={terms} onChange={e => setTerms(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>Authorised Signature (PNG)</label>
                    <div
                      onClick={() => signatureInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDraggingSignature(true); }}
                      onDragLeave={() => setDraggingSignature(false)}
                      onDrop={e => { e.preventDefault(); setDraggingSignature(false); handleSignatureFile(e.dataTransfer.files[0]); }}
                      style={{
                        border: `2px dashed ${draggingSignature ? 'var(--accent)' : signature ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 10, padding: signature ? '10px' : '20px 14px', textAlign: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: draggingSignature ? 'rgba(129,140,248,0.05)' : 'transparent',
                        position: 'relative'
                      }}
                    >
                      <input ref={signatureInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleSignatureFile(e.target.files[0])} />
                      {signature ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={signature} alt="signature" style={{ height: 40, maxWidth: 100, objectFit: 'contain', borderRadius: 4 }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>Signature uploaded ✓</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to change</div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setSignature(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}><RiCloseLine /></button>
                        </div>
                      ) : (
                        <>
                          <RiImageAddLine style={{ fontSize: '1.5rem', color: 'var(--text-muted)', display: 'block', margin: '0 auto 6px' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Drop Signature PNG here</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>or click to browse</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW PANEL ────────────────────────────────────────────────── */}
        {activeTab === 'preview' && (
          <div>
            <div ref={previewRef} style={{
              background: '#ffffff', color: '#000000', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              maxWidth: 820, margin: '0 auto', padding: '20px 24px', fontSize: 11,
              boxShadow: '0 4px 40px rgba(0,0,0,0.3)', borderRadius: 4,
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Background Transparent Watermark */}
              {logo && (
                <div style={{
                  position: 'absolute',
                  top: '55%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.15,
                  width: '90%',
                  pointerEvents: 'none',
                  zIndex: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <img src={logo} alt="watermark" style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }} />
                </div>
              )}

              {/* Quote Header */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000000', paddingBottom: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
                <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {logo ? (
                    <img src={logo} alt="Logo" style={{ maxHeight: 65, maxWidth: 180, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', letterSpacing: '-0.5px' }}>The First Step</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#4caf50', textTransform: 'uppercase', letterSpacing: '2px' }}>SOLUTIONS</div>
                      <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>Ideas. Innovation. Impact.</div>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid #cccccc', paddingLeft: 20, fontSize: 11, color: '#000000', lineHeight: 1.4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800 }}>📍</span>
                    <span>{companyAddress}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800 }}>📞</span>
                    <span>{companyPhone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800 }}>✉️</span>
                    <span>{companyEmail}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800 }}>🌐</span>
                    <span>{companyWebsite}</span>
                  </div>
                </div>
              </div>

              {/* Title & Date */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#000000' }}>
                  Quote: {clientCompany} And {companyName}
                </div>
                <div style={{ fontWeight: 800, fontSize: 11, color: '#000000', marginTop: 2 }}>
                  {quoteDate.split('-').reverse().join('.')}
                </div>
              </div>

              {/* Bill To */}
              <div style={{ marginBottom: 10, fontSize: 11, lineHeight: 1.4, color: '#000000' }}>
                <div style={{ fontWeight: 800 }}>M/s. {clientCompany}</div>
                <div>{clientAddress}</div>
              </div>

              {/* Salutation & Opening Paragraph */}
              <div style={{ marginBottom: 12, fontSize: 10.5, lineHeight: 1.4, color: '#000000' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{salutation}</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{greetings}</div>
                <p style={{ margin: 0 }}>{openingText}</p>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 10.5, border: '1px solid #000000' }}>
                <thead>
                  <tr style={{ background: '#81c784', border: '1px solid #000000' }}>
                    <th colSpan={4} style={{ padding: '4px 8px', textAlign: 'center', color: '#000000', fontWeight: 800, fontSize: 11, textDecoration: 'underline', border: '1px solid #000000' }}>Quote</th>
                  </tr>
                  <tr style={{ background: '#e2e8f0', color: '#000000', fontWeight: 700, border: '1px solid #000000' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '8%', border: '1px solid #000000' }}>S.No</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', width: '56%', border: '1px solid #000000' }}>Description</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: '20%', border: '1px solid #000000' }}>Size</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: '16%', border: '1px solid #000000' }}>Charges</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const amt = Number(item.qty) * Number(item.rate) * (1 - Number(item.discount) / 100);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #000000' }}>
                        <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000000' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000', whiteSpace: 'pre-line' }}>{item.description || '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000000' }}>{item.unit || '—'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, border: '1px solid #000000' }}>{Number(amt).toFixed(2)}</td>
                      </tr>
                    );
                  })}

                  {/* Totals */}
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000' }}>Total</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', border: '1px solid #000000' }}>{Number(subtotal).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000' }}>Discount</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', border: '1px solid #000000' }}>{Number(discountAmt).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000' }}>Sub Total</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', border: '1px solid #000000' }}>{Number(taxableAmt).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000' }}>CGST {(taxRate / 2)}%</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', border: '1px solid #000000' }}>{Number(taxAmt / 2).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 800 }}>
                    <td colSpan={3} style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #000000' }}>SGST {(taxRate / 2)}%</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', border: '1px solid #000000' }}>{Number(taxAmt / 2).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontWeight: 900, background: '#f8fafc' }}>
                    <td colSpan={3} style={{ padding: '6px 6px', textAlign: 'left', fontSize: 11, border: '2px solid #000000' }}>Grand Total</td>
                    <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: 11, border: '2px solid #000000', color: '#2e7d32' }}>{Number(grandTotal).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Terms and Conditions */}
              <div style={{ marginTop: 10, fontSize: 10.5, color: '#000000', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>Business Terms:</div>
                {notes ? notes.split('\n').map((line, idx) => (
                  <div key={idx} style={{ paddingLeft: 10 }}>• {line}</div>
                )) : '—'}
              </div>

              <div style={{ marginTop: 8, fontSize: 10.5, color: '#000000', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>Payment Terms:</div>
                {terms ? terms.split('\n').map((line, idx) => (
                  <div key={idx} style={{ paddingLeft: 10 }}>{line}</div>
                )) : '—'}
              </div>

              {/* Sign off and Bank Details */}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 10.5, color: '#000000' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Thanks & Regards</div>
                  <div style={{ fontWeight: 800, marginTop: 2 }}>For M/s. {clientCompany} And {companyName}</div>
                </div>

                {/* Account Details Box */}
                <div style={{ border: '1px solid #000000', padding: '6px 12px', background: '#f8fafc', borderRadius: 4, minWidth: 260, fontSize: 9.5, lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>Account Details</div>
                  <div><strong>Name of the bank :</strong> {bankName}</div>
                  <div><strong>Branch :</strong> {bankBranch}</div>
                  <div><strong>Acc No :</strong> {bankAccNo}</div>
                  <div><strong>IFSC Code :</strong> {bankIFSC}</div>
                  <div><strong>GSTIN :</strong> {companyGST}</div>
                </div>
              </div>

              {/* Signature Row */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', minWidth: 160 }}>
                  {signature ? (
                    <img src={signature} alt="Signature" style={{ height: 35, maxWidth: 120, objectFit: 'contain', marginBottom: 4 }} />
                  ) : (
                    <div style={{ height: 30 }} />
                  )}
                  <div style={{ borderTop: '1px solid #000000', paddingTop: 2, fontWeight: 700, fontSize: 9.5 }}>
                    Authorised Signatory
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              {canExport && (
                <button className="btn btn-primary btn-lg" onClick={exportPDF} disabled={exporting} id="export-pdf-preview-btn">
                  {exporting ? <><div className="spinner spinner-sm" /> Exporting...</> : <><RiDownloadLine /> Download PDF</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default QuotationPage;
