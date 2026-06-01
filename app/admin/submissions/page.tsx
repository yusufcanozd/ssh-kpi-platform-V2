'use client'
import Topbar from '@/components/layout/Topbar'

export default function AdminPage() {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <Topbar title="Admin" subtitle="Hazırlanıyor..." />
      <div style={{flex:1,overflow:'auto',padding:'20px 24px'}}>
        <div style={{background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:10,padding:40,textAlign:'center',color:'var(--tx3)',fontSize:14}}>
          Bu bölüm hazırlanıyor...
        </div>
      </div>
    </div>
  )
}
