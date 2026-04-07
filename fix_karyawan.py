import re

with open('src/app/dashboard/hrd/karyawan/baru/page.tsx', 'r') as f:
    content = f.read()

# Remove the internal component definitions from KaryawanBaruPage
internal_defs_pattern = r"  const inp = 'w-full.*?const POSITIONS = \['Barista'.*?'Other'\]\n"
match = re.search(internal_defs_pattern, content, re.DOTALL)
if not match:
    print("Could not find the internal definitions!")
    exit(1)

content = content.replace(match.group(0), "")

# The new definitions to be placed outside
new_defs = """
const inp = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'
const ist = { border: '1.5px solid #E8E4E0', backgroundColor: '#FAFAF9', boxSizing: 'border-box' as const }
const err_ist = { border: '1.5px solid #FF4F31', backgroundColor: '#FFF9F8', boxSizing: 'border-box' as const }
const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#4C4845', marginBottom: '5px' } as const

const Section = ({ id, title, openSections, toggleSection, children }: { id: string; title: string; openSections: string[]; toggleSection: (id: string) => void; children: React.ReactNode }) => {
  const open = openSections.includes(id)
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #E8E4E0', overflow: 'hidden', marginBottom: '12px' }}>
      <button onClick={() => toggleSection(id)} type="button"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#020000' }}>{title}</span>
        {open ? <ChevronUp size={16} color="#8A8A8D" /> : <ChevronDown size={16} color="#8A8A8D" />}
      </button>
      {open && <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>}
    </div>
  )
}

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>{children}</div>
)

const Field = ({ k, label, form, set, errors, required, type = 'text', options, placeholder }: {
  k: string; label: string; form: any; set: (k: string, v: any) => void; errors: any; required?: boolean; type?: string
  options?: { value: string; label: string }[]; placeholder?: string
}) => {
  const hasErr = !!errors[k]
  return (
    <div data-error={hasErr}>
      <label style={lbl}>{label} {required && <span style={{ color: '#FF4F31' }}>*</span>}</label>
      {options ? (
        <select className={inp} style={hasErr ? err_ist : ist} value={form[k] || ''}
          onChange={e => set(k, e.target.value)}>
          <option value="">Pilih...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} className={inp} style={hasErr ? err_ist : ist}
          value={form[k] || ''} onChange={e => set(k, e.target.value)}
          placeholder={placeholder} />
      )}
      {hasErr && <p style={{ fontSize: '11px', color: '#FF4F31', margin: '3px 0 0' }}>{errors[k]}</p>}
    </div>
  )
}

const Toggle = ({ k, label, form, set }: { k: string; label: string; form: any; set: (k: string, v: any) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: form[k] ? 'rgba(3,120,148,0.06)' : '#F7F5F2', border: `1px solid ${form[k] ? 'rgba(3,120,148,0.2)' : '#E8E4E0'}` }}>
    <span style={{ fontSize: '13px', color: '#020000', fontWeight: form[k] ? 600 : 400 }}>{label}</span>
    <button type="button" onClick={() => set(k, !form[k])}
      style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: form[k] ? '#037894' : '#D4CFC9', flexShrink: 0, transition: 'all 0.15s' }}>
      <span style={{ position: 'absolute', top: '2px', width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form[k] ? 'translateX(20px)' : 'translateX(2px)' }} />
    </button>
  </div>
)

const OUTLETS = ['La Piazza', 'MKG', 'BSD', 'SMS', 'SMB', 'SMB Gold Lounge', 'SMB2', 'Back Office', 'Hibrida / Back Office', 'Roastery', 'Academy', 'Semarang HO']
const POSITIONS = ['Barista', 'Senior Barista', 'Coordinator Bar', 'Head Bar', 'Trainer Academy', 'Waitress/Waiter', 'Kasir', 'Floor Coordinator', 'Head Floor', 'Cook Helper', 'Cook', 'Junior Cook', 'Kitchen Coordinator', 'Head Kitchen', 'Housekeeping', 'Senior Housekeeping', 'Steward', 'Supervisor', 'Area Manager', 'Admin HR', 'HR Manager', 'Admin Warehouse', 'Inventory Officer', 'Admin Purchasing', 'Staff Accounting', 'Admin Accounting', 'Coordinator Finance', 'Marketing', 'General Affair', 'Driver', 'Auditor', 'IT Staff', 'Head of Academy', 'Head of Marketing', 'Other']

"""

# Insert definitions before export default function
content = content.replace('export default function KaryawanBaruPage() {', new_defs + 'export default function KaryawanBaruPage() {')

# Replace component invocations
content = re.sub(r'<Section\b', r'<Section openSections={openSections} toggleSection={toggleSection}', content)
content = re.sub(r'<Field\b', r'<Field form={form} set={set} errors={errors}', content)
content = re.sub(r'<Toggle\b', r'<Toggle form={form} set={set}', content)

with open('src/app/dashboard/hrd/karyawan/baru/page.tsx', 'w') as f:
    f.write(content)

print("Done rewrite")
