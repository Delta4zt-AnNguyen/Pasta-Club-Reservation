import { useState, useEffect } from "react"

const INSIDE_TABLES = [
  "302","304","306","308","321/1","321/2","323","325",
  "310","320","330","322/1","322/2","324","326",
  "368","379","386/1","386/2","350","351","352"
]
const OUTSIDE_TABLES = [
  "501","502","511","512","513","514","515","516","517","518",
  "521","522","523","524","525"
]
const ALL_TABLES = [...INSIDE_TABLES, ...OUTSIDE_TABLES]
const TABLE_OPTIONS = ALL_TABLES.flatMap(t => [
  { value: `${t} - Round 1`, label: `${t} – R1`, area: INSIDE_TABLES.includes(t) ? "Inside" : "Outside" },
  { value: `${t} - Round 2`, label: `${t} – R2`, area: INSIDE_TABLES.includes(t) ? "Inside" : "Outside" },
])

const TIME_SLOTS = []
for (let h = 9; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:30`)
}
TIME_SLOTS.push("24:00")

const DEFAULT_TAGS = ["Birthday", "Anniversaries", "Isaac reservation", "Nick reservation"]
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const todayStr = () => new Date().toISOString().slice(0,10)
const fmtDate = (d) => { const [y,m,day] = d.split("-"); return `${day}/${m}/${y}` }
const emptyForm = { name:"", phone:"", tableNumber:"", area:"Inside", time:"", note:"", guestCount:"", tags:[] }

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [showCalendar, setShowCalendar] = useState(false)
  const [calMonth, setCalMonth] = useState(() => { const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()} })
  const [tab, setTab] = useState(0)
  const [dayData, setDayData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pcr_dayData") || "{}") } catch { return {} }
  })
  const [customTags, setCustomTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pcr_customTags") || "[]") } catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [historyDeleteConfirm, setHistoryDeleteConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [newTagInput, setNewTagInput] = useState("")
  const [showTagInput, setShowTagInput] = useState(false)

  useEffect(() => { localStorage.setItem("pcr_dayData", JSON.stringify(dayData)) }, [dayData])
  useEffect(() => { localStorage.setItem("pcr_customTags", JSON.stringify(customTags)) }, [customTags])

  const allTags = [...DEFAULT_TAGS, ...customTags]
  const isToday = selectedDate === todayStr()
  const getDayData = (date) => dayData[date] || { bookings: [], history: [] }
  const bookings = getDayData(selectedDate).bookings
  const history = getDayData(selectedDate).history

  const setBookings = (fn) => setDayData(prev => {
    const d = prev[selectedDate] || { bookings:[], history:[] }
    return { ...prev, [selectedDate]: { ...d, bookings: typeof fn==="function" ? fn(d.bookings) : fn } }
  })
  const setHistory = (fn) => setDayData(prev => {
    const d = prev[selectedDate] || { bookings:[], history:[] }
    return { ...prev, [selectedDate]: { ...d, history: typeof fn==="function" ? fn(d.history) : fn } }
  })

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name="Vui lòng nhập tên khách"
    if (!form.phone.trim()) e.phone="Vui lòng nhập số điện thoại"
    if (!form.tableNumber) e.tableNumber="Vui lòng chọn số bàn"
    if (!form.time) e.time="Vui lòng chọn thời gian"
    setErrors(e); return Object.keys(e).length===0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingId) {
      setBookings(prev => prev.map(b => b.id===editingId ? {...b,...form} : b))
      showToast("Đã cập nhật đặt bàn!")
    } else {
      setBookings(prev => [...prev, { id:generateId(), ...form, createdAt:new Date().toLocaleString("vi-VN") }])
      showToast("Đặt bàn thành công!")
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm); setErrors({}); setTab(0)
  }

  const handleEdit = (b) => {
    setForm({ name:b.name, phone:b.phone, tableNumber:b.tableNumber, area:b.area, time:b.time, note:b.note, guestCount:b.guestCount||"", tags:b.tags||[] })
    setEditingId(b.id); setShowForm(true); setErrors({})
  }

  const handleDelete = (id) => {
    const b = bookings.find(x=>x.id===id)
    setBookings(prev => prev.filter(x=>x.id!==id))
    setHistory(prev => [{ ...b, deletedAt:new Date().toLocaleString("vi-VN") }, ...prev])
    setDeleteConfirm(null)
    showToast("Đã trả bàn và lưu vào lịch sử.", "info")
  }

  const handleHistoryDelete = (id) => {
    setHistory(prev => prev.filter(x=>x.id!==id))
    setHistoryDeleteConfirm(null)
    showToast("Đã xoá khỏi lịch sử.", "info")
  }

  const addCustomTag = () => {
    const t = newTagInput.trim()
    if (t && !allTags.includes(t)) { setCustomTags(prev=>[...prev,t]); showToast(`Đã thêm tag "${t}"`) }
    setNewTagInput(""); setShowTagInput(false)
  }

  const toggleTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t=>t!==tag) : [...f.tags, tag] }))
  }

  const exportCSV = () => {
    if (history.length===0) return
    const headers = ["Ngày","Tên khách","Số điện thoại","Số bàn","Round","Khu vực","Giờ","Số khách","Tags","Ghi chú","Giờ đặt","Giờ trả bàn"]
    const rows = history.map(b => {
      const parts = b.tableNumber.split(" - ")
      return [selectedDate, b.name, b.phone, `Bàn ${parts[0]}`, parts[1]||"", b.area, b.time, b.guestCount||"", (b.tags||[]).join("; "), b.note||"", b.createdAt||"", b.deletedAt||""]
        .map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")
    })
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}))
    a.download = `lich-su-${selectedDate}.csv`
    a.click()
    showToast("Đã xuất file CSV!")
  }

  const occupiedSlots = bookings.map(b=>b.tableNumber)
  const totalFree = TABLE_OPTIONS.filter(o=>!occupiedSlots.includes(o.value)).length
  const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate()
  const getFirstDay = (y,m) => new Date(y,m,1).getDay()
  const hasDayData = (dateStr) => { const d=dayData[dateStr]; return d && (d.bookings.length>0||d.history.length>0) }
  const inp = (field) => `w-full bg-white border-2 ${errors[field]?"border-red-400":"border-gray-200"} rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 transition-colors text-sm`
  const areaColor = (area) => area==="Inside" ? "bg-blue-900/60 text-blue-300" : "bg-green-900/60 text-green-300"

  const TableGrid = ({ tables }) => tables.map(t => {
    const r1=bookings.find(b=>b.tableNumber===`${t} - Round 1`)
    const r2=bookings.find(b=>b.tableNumber===`${t} - Round 2`)
    return (
      <div key={t} className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-2 flex items-center gap-2">
        <div className="text-amber-400 font-bold text-sm w-12 text-center">{t}</div>
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {[{label:"R1",data:r1},{label:"R2",data:r2}].map(({label,data})=>(
            <div key={label} className={`rounded-lg px-2 py-1 text-xs ${data?"bg-red-900/30 border border-red-800/50":"bg-[#1a1a2e] border border-[#2e2e50]"}`}>
              <div className={`font-semibold text-[10px] mb-0.5 ${data?"text-red-400":"text-gray-500"}`}>{label}</div>
              {data ? (
                <div>
                  <div className="text-white truncate font-medium">{data.name}</div>
                  <div className="text-gray-400 text-[10px]">{data.time}{data.guestCount?` · 👥${data.guestCount}`:""}</div>
                  {(data.tags||[]).length>0 && <div className="flex flex-wrap gap-0.5 mt-0.5">{data.tags.slice(0,2).map(tag=><span key={tag} className="text-[9px] bg-[#c8102e]/30 text-red-300 px-1 rounded">{tag}</span>)}</div>}
                </div>
              ) : <div className="text-green-400 font-semibold">Trống</div>}
            </div>
          ))}
        </div>
      </div>
    )
  })

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white" style={{fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div className="bg-[#12122a] border-b border-[#1e1e3a] px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{background:"#c8102e"}}>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="100" height="100" fill="#c8102e"/>
                <text x="50" y="36" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#f5f0e8" letterSpacing="-1">PASTA</text>
                <text x="50" y="62" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#f5f0e8" letterSpacing="-1">CLUB</text>
                <text x="50" y="80" textAnchor="middle" fontFamily="Georgia,serif" fontStyle="italic" fontSize="10" fill="#f5f0e8">not so Italian</text>
              </svg>
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">Pasta Club</div>
              <div className="text-xs font-medium" style={{color:"#c8102e"}}>Reservation</div>
            </div>
          </div>
          <button onClick={()=>{ if(!isToday){showToast("Chỉ có thể đặt bàn ở ngày hôm nay","info");return;} setShowForm(true);setEditingId(null);setForm(emptyForm);setErrors({}) }}
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1">
            <span className="text-base leading-none">+</span> Đặt bàn
          </button>
        </div>
        <button onClick={()=>setShowCalendar(v=>!v)}
          className="w-full flex items-center justify-between bg-[#1a1a2e] border border-[#2e2e50] rounded-xl px-3 py-2 text-sm">
          <span className="text-gray-300">📅 <span className="font-semibold text-white">{fmtDate(selectedDate)}</span>{isToday&&<span className="text-amber-400 text-xs ml-1">Hôm nay</span>}</span>
          <span className="text-gray-500 text-xs">{showCalendar?"▲":"▼"}</span>
        </button>
      </div>

      {/* Calendar */}
      {showCalendar && (
        <div className="bg-[#12122a] border-b border-[#1e1e3a] px-4 py-3 z-20">
          <div className="flex items-center justify-between mb-3">
            <button onClick={()=>setCalMonth(p=>{ const d=new Date(p.y,p.m-1); return{y:d.getFullYear(),m:d.getMonth()} })} className="text-gray-400 hover:text-white px-2 text-lg">‹</button>
            <span className="text-sm font-semibold text-white">{new Date(calMonth.y,calMonth.m).toLocaleString("vi-VN",{month:"long",year:"numeric"})}</span>
            <button onClick={()=>setCalMonth(p=>{ const d=new Date(p.y,p.m+1); return{y:d.getFullYear(),m:d.getMonth()} })} className="text-gray-400 hover:text-white px-2 text-lg">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {["CN","T2","T3","T4","T5","T6","T7"].map(d=><div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(getFirstDay(calMonth.y,calMonth.m)).fill(null).map((_,i)=><div key={`e${i}`}/>)}
            {Array(getDaysInMonth(calMonth.y,calMonth.m)).fill(null).map((_,i)=>{
              const day=String(i+1).padStart(2,"0"), mo=String(calMonth.m+1).padStart(2,"0")
              const dateStr=`${calMonth.y}-${mo}-${day}`
              const isSelected=dateStr===selectedDate, isT=dateStr===todayStr(), hasData=hasDayData(dateStr)
              return (
                <button key={i} onClick={()=>{ setSelectedDate(dateStr); setShowCalendar(false); setTab(0) }}
                  className={`rounded-lg py-1.5 text-xs font-medium relative transition-colors ${isSelected?"bg-amber-400 text-black":isT?"bg-amber-900/40 text-amber-300":"text-gray-300 hover:bg-[#1e1e3a]"}`}>
                  {i+1}
                  {hasData&&!isSelected&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"/>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#1e1e3a] bg-[#12122a]">
        {[{label:"Đang đặt",icon:"📋",count:bookings.length},{label:"Bàn trống",icon:"🪑",count:totalFree},{label:"Lịch sử",icon:"🗂",count:history.length}].map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)}
            className={`flex-1 py-2 px-1 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${tab===i?"text-amber-400 border-b-2 border-amber-400":"text-gray-500 hover:text-gray-300"}`}>
            <span>{t.icon}</span><span>{t.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab===i?"bg-amber-400 text-black":"bg-[#1e1e3a] text-gray-400"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="p-3 pb-20">

        {/* TAB 0 – Đang đặt */}
        {tab===0 && (bookings.length===0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="text-5xl mb-3">📭</div>
            <div className="text-sm font-medium">{isToday?"Chưa có đặt bàn nào":`Không có đặt bàn ngày ${fmtDate(selectedDate)}`}</div>
            {isToday&&<div className="text-xs mt-1">Nhấn &quot;+ Đặt bàn&quot; để bắt đầu</div>}
          </div>
        ) : (
          <div className="bg-[#12122a] border border-[#1e1e3a] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-0 bg-[#1a1a2e] px-3 py-2 text-xs text-gray-400 font-semibold border-b border-[#1e1e3a]">
              <div className="col-span-3">Tên</div><div className="col-span-2 text-center">Bàn</div>
              <div className="col-span-2 text-center">Giờ</div><div className="col-span-1 text-center">KV</div>
              <div className="col-span-3 text-center">Khách</div><div className="col-span-1"></div>
            </div>
            {bookings.map((b,idx)=>(
              <div key={b.id} className={`px-3 py-2 text-xs border-b border-[#1e1e3a] last:border-0 ${idx%2===0?"":"bg-[#0f0f22]"}`}>
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-3 font-semibold text-white truncate pr-1">{b.name}</div>
                  <div className="col-span-2 text-center"><span className="text-amber-400 font-bold">{b.tableNumber.split(" - ")[0]}</span><span className="text-gray-500 text-[10px] block leading-tight">{b.tableNumber.split(" - ")[1]}</span></div>
                  <div className="col-span-2 text-center text-gray-300 font-medium">{b.time}</div>
                  <div className="col-span-1 text-center"><span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${areaColor(b.area)}`}>{b.area==="Inside"?"In":"Out"}</span></div>
                  <div className="col-span-3 text-center text-gray-300">{b.guestCount?`👥 ${b.guestCount}`:"—"}</div>
                  <div className="col-span-1 flex flex-col gap-1 items-end">
                    {isToday&&<button onClick={()=>handleEdit(b)} className="text-gray-400 hover:text-amber-400">✏️</button>}
                    {isToday&&<button onClick={()=>setDeleteConfirm(b.id)} className="text-gray-400 hover:text-red-400">🗑</button>}
                  </div>
                </div>
                {(b.tags||[]).length>0&&<div className="flex flex-wrap gap-1 mt-1.5">{b.tags.map(tag=><span key={tag} className="text-[9px] bg-[#c8102e]/30 text-red-300 border border-[#c8102e]/40 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>)}</div>}
              </div>
            ))}
          </div>
        ))}

        {/* TAB 1 – Bàn trống */}
        {tab===1 && (
          <div>
            <div className="mb-3 flex gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Trống</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Đang dùng</span>
            </div>
            <div className="mb-2 text-xs font-bold text-blue-400 px-1">🏠 Inside</div>
            <div className="space-y-1.5 mb-4"><TableGrid tables={INSIDE_TABLES}/></div>
            <div className="mb-2 text-xs font-bold text-green-400 px-1">🌿 Outside</div>
            <div className="space-y-1.5"><TableGrid tables={OUTSIDE_TABLES}/></div>
          </div>
        )}

        {/* TAB 2 – Lịch sử */}
        {tab===2 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs text-gray-400">{history.length} bản ghi · {fmtDate(selectedDate)}</div>
              <button onClick={exportCSV} disabled={history.length===0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${history.length>0?"bg-emerald-600 hover:bg-emerald-500 text-white":"bg-[#1e1e3a] text-gray-600 cursor-not-allowed"}`}>
                📊 Xuất CSV
              </button>
            </div>
            {history.length===0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="text-5xl mb-3">🗂</div>
                <div className="text-sm">Không có lịch sử ngày {fmtDate(selectedDate)}</div>
              </div>
            ) : (
              <div className="bg-[#12122a] border border-[#1e1e3a] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-0 bg-[#1a1a2e] px-3 py-2 text-xs text-gray-400 font-semibold border-b border-[#1e1e3a]">
                  <div className="col-span-3">Tên</div><div className="col-span-2 text-center">Bàn</div>
                  <div className="col-span-2 text-center">Giờ</div><div className="col-span-2 text-center">Khách</div>
                  <div className="col-span-2 text-center">Trả lúc</div><div className="col-span-1"></div>
                </div>
                {history.map((b,idx)=>(
                  <div key={b.id} className={`px-3 py-2 text-xs border-b border-[#1e1e3a] last:border-0 opacity-80 ${idx%2===0?"":"bg-[#0f0f22]"}`}>
                    <div className="grid grid-cols-12 gap-0 items-center">
                      <div className="col-span-3 text-gray-300 truncate font-medium">{b.name}</div>
                      <div className="col-span-2 text-center"><span className="text-gray-400 font-bold">{b.tableNumber.split(" - ")[0]}</span><span className="text-gray-600 text-[10px] block">{b.tableNumber.split(" - ")[1]}</span></div>
                      <div className="col-span-2 text-center text-gray-400">{b.time}</div>
                      <div className="col-span-2 text-center text-gray-400">{b.guestCount||"—"}</div>
                      <div className="col-span-2 text-center text-gray-500 text-[10px] leading-tight">{b.deletedAt}</div>
                      <div className="col-span-1 flex justify-end"><button onClick={()=>setHistoryDeleteConfirm(b.id)} className="text-gray-600 hover:text-red-400">🗑</button></div>
                    </div>
                    {(b.tags||[]).length>0&&<div className="flex flex-wrap gap-1 mt-1">{b.tags.map(tag=><span key={tag} className="text-[9px] bg-[#c8102e]/20 text-red-400 border border-[#c8102e]/30 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={e=>e.target===e.currentTarget&&(setShowForm(false),setEditingId(null))}>
          <div className="bg-[#12122a] w-full rounded-t-3xl border-t border-[#1e1e3a] p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white text-base">{editingId?"✏️ Chỉnh sửa":"🍝 Đặt bàn mới"}</div>
              <button onClick={()=>{setShowForm(false);setEditingId(null)}} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 mb-1 block font-semibold">Tên khách *</label>
                <input className={inp("name")} placeholder="Nguyễn Văn A" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                {errors.name&&<div className="text-red-400 text-xs mt-1">{errors.name}</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 mb-1 block font-semibold">Số điện thoại *</label>
                  <input className={inp("phone")} placeholder="0901 234 567" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
                  {errors.phone&&<div className="text-red-400 text-xs mt-1">{errors.phone}</div>}
                </div>
                <div>
                  <label className="text-xs text-gray-300 mb-1 block font-semibold">Số khách</label>
                  <input className={inp("guestCount")} placeholder="VD: 4" type="number" min="1" value={form.guestCount} onChange={e=>setForm(f=>({...f,guestCount:e.target.value}))}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 mb-1 block font-semibold">Số bàn *</label>
                  <select className={inp("tableNumber")} value={form.tableNumber} onChange={e=>{ const opt=TABLE_OPTIONS.find(o=>o.value===e.target.value); setForm(f=>({...f,tableNumber:e.target.value,area:opt?.area||f.area})) }}>
                    <option value="">Chọn bàn</option>
                    <optgroup label="🏠 Inside">{TABLE_OPTIONS.filter(o=>o.area==="Inside").map(o=>{ const taken=occupiedSlots.includes(o.value)&&o.value!==(bookings.find(b=>b.id===editingId)?.tableNumber); return <option key={o.value} value={o.value} disabled={taken}>{o.label}{taken?" ✗":""}</option> })}</optgroup>
                    <optgroup label="🌿 Outside">{TABLE_OPTIONS.filter(o=>o.area==="Outside").map(o=>{ const taken=occupiedSlots.includes(o.value)&&o.value!==(bookings.find(b=>b.id===editingId)?.tableNumber); return <option key={o.value} value={o.value} disabled={taken}>{o.label}{taken?" ✗":""}</option> })}</optgroup>
                  </select>
                  {errors.tableNumber&&<div className="text-red-400 text-xs mt-1">{errors.tableNumber}</div>}
                </div>
                <div>
                  <label className="text-xs text-gray-300 mb-1 block font-semibold">Thời gian *</label>
                  <select className={inp("time")} value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}>
                    <option value="">Chọn giờ</option>
                    {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.time&&<div className="text-red-400 text-xs mt-1">{errors.time}</div>}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-300 mb-1.5 block font-semibold">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {allTags.map(tag=><button key={tag} type="button" onClick={()=>toggleTag(tag)} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors border ${form.tags.includes(tag)?"bg-amber-400 text-black border-amber-400":"bg-[#1a1a2e] text-gray-400 border-[#2e2e50] hover:border-amber-400"}`}>{tag}</button>)}
                  <button type="button" onClick={()=>setShowTagInput(v=>!v)} className="text-xs px-2.5 py-1 rounded-lg font-medium bg-[#1a1a2e] text-gray-500 border border-dashed border-[#2e2e50] hover:border-amber-400">+ Tag mới</button>
                </div>
                {showTagInput&&<div className="flex gap-2"><input className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-amber-400" placeholder="Tên tag mới..." value={newTagInput} onChange={e=>setNewTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomTag()}/><button onClick={addCustomTag} className="bg-amber-400 text-black px-3 py-2 rounded-xl text-xs font-bold">Thêm</button></div>}
              </div>
              <div>
                <label className="text-xs text-gray-300 mb-1 block font-semibold">Yêu cầu đặc biệt</label>
                <textarea className={inp("note")+" resize-none h-14"} placeholder="Sinh nhật, dị ứng thực phẩm..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={()=>{setShowForm(false);setEditingId(null)}} className="flex-1 bg-[#1e1e3a] text-gray-300 py-3 rounded-xl font-semibold text-sm">Huỷ</button>
                <button onClick={handleSave} className="flex-1 bg-amber-400 hover:bg-amber-300 text-black py-3 rounded-xl font-bold text-sm transition-colors">{editingId?"Cập nhật":"Lưu đặt bàn"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      {deleteConfirm&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6">
          <div className="bg-[#12122a] border border-[#1e1e3a] rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-4"><div className="text-4xl mb-2">🗑</div><div className="font-bold text-white text-base">Xác nhận trả bàn?</div><div className="text-gray-400 text-sm mt-1">Thông tin sẽ lưu vào lịch sử ngày {fmtDate(selectedDate)}.</div></div>
            <div className="flex gap-3"><button onClick={()=>setDeleteConfirm(null)} className="flex-1 bg-[#1e1e3a] text-gray-300 py-3 rounded-xl font-semibold text-sm">Huỷ</button><button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm">Xác nhận</button></div>
          </div>
        </div>
      )}
      {historyDeleteConfirm&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6">
          <div className="bg-[#12122a] border border-[#1e1e3a] rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-4"><div className="text-4xl mb-2">🗑</div><div className="font-bold text-white text-base">Xoá khỏi lịch sử?</div><div className="text-gray-400 text-sm mt-1">Bản ghi này sẽ bị xoá vĩnh viễn.</div></div>
            <div className="flex gap-3"><button onClick={()=>setHistoryDeleteConfirm(null)} className="flex-1 bg-[#1e1e3a] text-gray-300 py-3 rounded-xl font-semibold text-sm">Huỷ</button><button onClick={()=>handleHistoryDelete(historyDeleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm">Xoá</button></div>
          </div>
        </div>
      )}

      {toast&&(
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl ${toast.type==="info"?"bg-blue-600":"bg-green-600"} text-white`}>{toast.msg}</div>
      )}
    </div>
  )
}
