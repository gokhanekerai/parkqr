import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, BellRing, MessageCircle, Phone, PhoneOff, MessageSquare, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { db, auth, getTagById, activateTag, createNotification, deleteTagRecord, updateTagInfo, requestNotificationPermission, deleteNotificationRecord } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

function App() {
  // Giriş yapalım (Anonim de olsa bildirim atabilmek için)
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <div className="container">
        <header className="app-header">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="app-logo">
              <ShieldCheck size={28} color="var(--accent-color)" />
              <div>Park<span>QR</span></div>
            </div>
          </Link>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/id/:tagId" element={<ScanTag />} />
          <Route path="/activate/:tagId" element={<ActivateTag />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <div className="glass-card" style={{textAlign: 'center'}}>
      <h1>Gizli Numara, Güvenli İletişim</h1>
      <p>Araç camınıza bırakacağınız QR kod ile telefon numaranızı paylaşmadan anında bildirim alın.</p>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px'}}>
        <Link to="/dashboard" className="btn btn-primary">
          <BellRing size={20} />
          Kontrol Paneli (Gelen Bildirimler)
        </Link>
        
        <Link to="/activate/demo123" className="btn btn-outline">
          Sistemi Test Et (Yeni Etiket)
        </Link>
      </div>
    </div>
  );
}

function ScanTag() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchTag = async () => {
      const tag = await getTagById(tagId);
      if (!tag) {
        navigate(`/activate/${tagId}`);
        return;
      }
      setTag(tag);
      setLoading(false);
    };
    fetchTag();
  }, [tagId, navigate]);

  const handleSend = async () => {
    if (phone.length < 10) return alert('Lütfen geçerli bir numara girin');
    setSending(true);
    await createNotification(tag.plate, phone, tag.ownerUid);
    setSending(false);
    setDone(true);
  };

  if (loading) return <div className="glass-card" style={{textAlign: 'center'}}><Loader2 className="spinner" size={32} /></div>;
  
  if (done) return (
    <div className="glass-card" style={{textAlign: 'center'}}>
      <div style={{fontSize: '48px', marginBottom: '16px'}}>✅</div>
      <h2>Bildirim Gönderildi!</h2>
      <p>Araç sahibinin telefonuna anında bildirim düştü. Lütfen aracın başında bekleyin.</p>
    </div>
  );

  return (
    <div className="glass-card">
      <div className="badge badge-success" style={{marginBottom: '16px'}}>Araç Bulundu</div>
      <h2><span style={{color:'var(--accent-color)'}}>{tag?.plate}</span> Sahibini Çağır</h2>
      <p>Bu aracın çıkışınızı engellediğini veya bir sorun olduğunu mu düşünüyorsunuz?</p>
      
      <div className="form-group" style={{marginTop: '20px'}}>
        <label>Size ulaşabilmesi için numaranız:</label>
        <input 
          type="tel" 
          placeholder="05XX XXX XX XX" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <small style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#10b981', textAlign: 'left', lineHeight: '1.4'}}>
          <ShieldCheck size={16} style={{flexShrink: 0}} /> 
          Numaranız araç sahibinin paneline şifreli olarak iletilir. Araç sahibi %100 gizli kalır.
        </small>
      </div>
      
      <button 
        className="btn btn-danger" 
        onClick={handleSend} 
        disabled={sending}
      >
        {sending ? 'Gönderiliyor...' : 'Acil Bildirim Gönder'}
      </button>
    </div>
  );
}

function ActivateTag() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async () => {
    if (!plate) return alert('Lütfen plaka girin');
    setSaving(true);
    
    // Anonim kullanıcı ile eşleştir
    const uid = auth.currentUser ? auth.currentUser.uid : 'temp-user';
    await activateTag(tagId, plate, uid, phone);
    
    setSaving(false);
    alert('Harika! QR kodunuz başarıyla plakanızla eşleşti.');
    navigate(`/id/${tagId}`);
  };

  return (
    <div className="glass-card">
      <div className="badge" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', marginBottom: '16px'}}>Yeni Etiket</div>
      <h2>QR Kodu Aktifleştir</h2>
      <p>Bu QR kod henüz boş. Kendi aracınızla eşleştirmek için bilgilerinizi girin.</p>
      
      <div className="form-group" style={{marginTop: '20px'}}>
        <label>Plakanız:</label>
        <input 
          type="text" 
          placeholder="34 ABC 123" 
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
      </div>

      <div className="form-group" style={{marginTop: '16px'}}>
        <label>Telefon Numaranız (Opsiyonel):</label>
        <input 
          type="tel" 
          placeholder="05XX XXX XX XX" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <small style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#10b981', textAlign: 'left', lineHeight: '1.4'}}>
          <ShieldCheck size={16} style={{flexShrink: 0}} /> 
          Telefonunuz 256-bit ile şifrelenir. Yoldan geçen vatandaşlar barkodu okutsa bile numaranızı ASLA göremez.
        </small>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleActivate}
        disabled={saving}
      >
        {saving ? 'Kaydediliyor...' : 'Eşleştir ve Aktifleştir'}
      </button>
    </div>
  );
}

function Dashboard() {
  const [notifications, setNotifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [editPlateValue, setEditPlateValue] = useState("");
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const audioRef = useRef(null);
  
  // İlk yüklemeyi takip etmek için (eski bildirimlerde ses çalmasın diye)
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Alarm sesini yükle
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    
    // Auth yüklenmesini bekle
    const checkUser = setInterval(() => {
      if (auth.currentUser) {
        clearInterval(checkUser);
        startListening(auth.currentUser.uid);
      }
    }, 500);

    return () => clearInterval(checkUser);
  }, []);

  const startListening = (uid) => {
    const q = query(
      collection(db, 'notifications'), 
      where('ownerUid', '==', uid)
    );

    const unsubNotif = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Client-side sort
      
      setNotifications(notifs);
      setLoading(false);

      // Sadece yeni bir belge EKLENDİĞİNDE (ilk yükleme hariç) ses çal
      if (!isFirstLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            audioRef.current.play().catch(e => console.log('Ses çalma izni yok:', e));
            
            // Titreşim ekle (Destekleyen telefonlar için)
            if (navigator.vibrate) {
              navigator.vibrate([500, 200, 500, 200, 500]);
            }

            // Basit bir browser alarm uyarısı da çıkarabiliriz (kullanıcı arka plandaysa dikkat çeksin diye)
            if (Notification.permission === 'granted') {
              new Notification('🚗 Aracınız İçin Acil Çağrı Var!');
            }
          }
        });
      }
      isFirstLoad.current = false;
    });

    const qTags = query(collection(db, 'tags'), where('ownerUid', '==', uid));
    const unsubTags = onSnapshot(qTags, (snapshot) => {
      const myTags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTags(myTags);
    });

    return () => {
      unsubNotif();
      unsubTags();
    };
  };

  // Kullanıcıdan ses ve bildirim izni istemek için bir buton
  const requestPermissions = () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    // Sesi tetikle (Kullanıcı etkileşimi olmadan tarayıcı ses çalmayı engelleyebilir, bu bir test olur)
    audioRef.current.play().then(() => audioRef.current.pause());
  };

  if (loading) return <div className="glass-card" style={{textAlign: 'center'}}><Loader2 className="spinner" size={32} /></div>;

  const handleCreateNewTag = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/activate/${randomId}`);
  };

  const handleEditPlateClick = (tag) => {
    setEditingTag(tag.id);
    setEditPlateValue(tag.plate);
    setEditPhoneValue(tag.ownerPhone || "");
  };

  const handleSavePlate = async (tagId) => {
    if (editPlateValue.trim() !== "") {
      await updateTagInfo(tagId, editPlateValue.trim().toUpperCase(), editPhoneValue.trim());
    }
    setEditingTag(null);
  };

  const handleEnableNotifications = async () => {
    const success = await requestNotificationPermission(auth.currentUser.uid);
    if (success) {
      alert("Harika! Artık arabanızın başına biri geldiğinde anında bildirim alacaksınız.");
    } else {
      alert("Bildirim izni alınamadı. Tarayıcı ayarlarından bildirimleri açtığınıza emin olun.");
    }
  };

  return (
    <>
      <div className="glass-card">
        <div style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
          <div>
            <h3 style={{margin: '0 0 4px 0', fontSize: '1rem', color: '#fff'}}>🔔 Anında Bildirimler</h3>
            <p style={{margin: 0, fontSize: '0.8rem', color: '#94a3b8'}}>Ekran kapalıyken bile telefonunuza bildirim gelsin.</p>
          </div>
          <button onClick={handleEnableNotifications} className="btn btn-primary" style={{padding: '8px 16px', fontSize: '0.9rem', minWidth: 'auto', background: '#3b82f6'}}>
            Bildirimleri Aç
          </button>
        </div>

        <div style={{marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h2>Kayıtlı Araçlarım</h2>
          <button className="btn btn-outline" onClick={handleCreateNewTag} style={{padding: '8px 12px', fontSize: '0.85rem'}}>
            + Yeni Ekle
          </button>
        </div>
        
        {tags.length === 0 ? (
          <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>Henüz eşleştirilmiş bir etiketiniz yok.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {tags.map(tag => (
              <div key={tag.id} style={{
                background: 'rgba(0,0,0,0.2)', 
                padding: '16px', 
                borderRadius: '12px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {editingTag === tag.id ? (
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        <input type="text" value={editPlateValue} onChange={(e) => setEditPlateValue(e.target.value)} placeholder="Plaka" style={{padding: '4px', borderRadius: '4px', border: '1px solid #ccc', color: 'black', width: '90px'}} />
                        <input type="tel" value={editPhoneValue} onChange={(e) => setEditPhoneValue(e.target.value)} placeholder="Telefon" style={{padding: '4px', borderRadius: '4px', border: '1px solid #ccc', color: 'black', width: '110px'}} />
                        <button onClick={() => handleSavePlate(tag.id)} style={{background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>Kaydet</button>
                        <button onClick={() => setEditingTag(null)} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>İptal</button>
                      </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <strong style={{color: 'white', fontSize: '1.1rem'}}>{tag.plate}</strong>
                            <button onClick={() => handleEditPlateClick(tag)} style={{background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'}}>Düzenle</button>
                          </div>
                          <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Tag ID: {tag.id}</span>
                          {tag.ownerPhone && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Tel: {tag.ownerPhone}</span>}
                        </div>
                    )}
                  </div>
                  <button className="btn btn-primary" style={{padding: '6px 12px', fontSize: '0.8rem', minWidth: 'auto'}} onClick={() => setShowQR(showQR === tag.tagId ? null : tag.tagId)}>
                    {showQR === tag.tagId ? 'Gizle' : 'QR Göster'}
                  </button>
                </div>
                
                {showQR === tag.tagId && (
                  <div style={{marginTop: '16px', padding: '16px', background: 'white', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <QRCodeSVG value={`https://parkqr-nine.vercel.app/id/${tag.tagId}`} size={200} />
                    <p style={{color: '#333', marginTop: '12px', fontWeight: 'bold', textAlign: 'center', margin: '12px 0 0 0'}}>Bu karekodu başka bir telefonla okutun</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>Gelen Çağrılar</h2>
        <div className="badge badge-success" style={{display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer'}} onClick={requestPermissions}>
          <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite'}}></div>
          Canlı Dinleniyor
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {notifications.length === 0 ? (
        <p style={{textAlign: 'center', padding: '40px 0'}}>Henüz hiç çağrı almadınız.</p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          {notifications.map(notif => {
            // Sadece sayıları al
            const cleanPhone = notif.senderPhone.replace(/\D/g, '');
            // WhatsApp Linki (Başına 90 ekleriz, Türkiye varsayımı)
            const waLink = `https://wa.me/90${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
            
            return (
              <div key={notif.id} style={{
                background: 'rgba(0,0,0,0.2)', 
                padding: '16px', 
                borderRadius: '12px',
                borderLeft: '4px solid var(--accent-color)'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <strong style={{color: 'white'}}>{notif.plate}</strong>
                  <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                    {new Date(notif.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>
                
                <p style={{margin: '0 0 12px 0', fontSize: '0.9rem'}}>Numara: {notif.senderPhone}</p>
                
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                  <a href={`tel:+90${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`} className="btn" style={{
                    background: 'rgba(255, 255, 255, 0.1)', 
                    color: 'white', 
                    padding: '8px 12px', 
                    fontSize: '0.85rem',
                    flex: '1',
                    minWidth: '90px'
                  }}>
                    <Phone size={16} />
                    Normal Ara
                  </a>

                  <a href={`tel:%2331%23${cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone}`} className="btn" style={{
                    background: 'var(--accent-color)', 
                    color: 'white', 
                    padding: '8px 12px', 
                    fontSize: '0.85rem',
                    flex: '1',
                    minWidth: '90px'
                  }}>
                    <PhoneOff size={16} />
                    Gizli Ara
                  </a>

                  <a href={waLink} target="_blank" rel="noreferrer" className="btn" style={{
                    background: '#22c55e', 
                    color: 'white', 
                    padding: '8px 12px', 
                    fontSize: '0.85rem',
                    flex: '1',
                    minWidth: '90px'
                  }}>
                    <MessageSquare size={16} />
                    WhatsApp
                  </a>

                  <button onClick={() => setDeleteConfirm(notif.id)} className="btn btn-danger" style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    flex: '0',
                    minWidth: 'auto'
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
          <div className="glass-card" style={{margin: '20px', textAlign: 'center', maxWidth: '300px'}}>
            <h3 style={{color: '#ef4444', marginBottom: '12px'}}>Çağrıyı Sil</h3>
            <p style={{fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '20px'}}>Bu çağrıyı geçmişten tamamen silmek istediğinize emin misiniz?</p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)} style={{padding: '8px 16px', fontSize: '0.9rem', flex: 1}}>İptal</button>
              <button className="btn btn-danger" onClick={async () => {
                await deleteNotificationRecord(deleteConfirm);
                setDeleteConfirm(null);
              }} style={{padding: '8px 16px', fontSize: '0.9rem', flex: 1}}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="glass-card" style={{marginTop: '20px', textAlign: 'center'}}>
        <h3 style={{color: 'var(--accent-color)', marginBottom: '16px'}}>Neden ParkQR? (Tam Gizlilik)</h3>
        
        <div style={{textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px'}}>
          <ul style={{margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <li style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
              <ShieldCheck size={20} color="#10b981" style={{flexShrink: 0, marginTop: '2px'}} />
              <p style={{margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5'}}><strong>Siz Gizli Kalırsınız:</strong> Aracınıza barkod okutulduğunda vatandaş telefon numaranızı asla göremez.</p>
            </li>
            <li style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
              <ShieldCheck size={20} color="#10b981" style={{flexShrink: 0, marginTop: '2px'}} />
              <p style={{margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5'}}><strong>Arama Kontrolü Sizde:</strong> Çağrı aldığınızda panelinizden tek tuşla <strong>"Gizli Numaradan Ara"</strong> diyerek kendi numaranızı saklayıp vatandaşı arayabilirsiniz.</p>
            </li>
            <li style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
              <ShieldCheck size={20} color="#10b981" style={{flexShrink: 0, marginTop: '2px'}} />
              <p style={{margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5'}}><strong>Rahatsızlıklara Son:</strong> Gece yarıları sapıklar tarafından aranma veya numaranızın reklamcıların eline geçme derdi biter.</p>
            </li>
          </ul>
        </div>
        <div style={{fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px'}}>
          <p style={{marginBottom: '8px'}}>Proje Kurucusu ve Geliştirici: <strong>Gökhan Eker</strong></p>
          <div style={{display: 'flex', justifyContent: 'center', gap: '16px'}}>
            <a href="https://github.com/gokhanekerai/parkqr" target="_blank" rel="noreferrer" style={{color: 'var(--accent-color)', textDecoration: 'none'}}>Proje Kodları (GitHub)</a>
          </div>
        </div>
      </div>
    </>
  );
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [tags, setTags] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editPlateValue, setEditPlateValue] = useState("");
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pass === '123456') {
      setAuthed(true);
      fetchData();
    } else {
      alert('Hatalı şifre!');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const tSnap = await getDocs(collection(db, 'tags'));
    setTags(tSnap.docs.map(d => ({id: d.id, ...d.data()})));
    
    const nSnap = await getDocs(collection(db, 'notifications'));
    setNotifs(nSnap.docs.map(d => ({id: d.id, ...d.data()})));
    setLoading(false);
  };

  const handleDeleteTag = async (id) => {
    await deleteTagRecord(id);
    setConfirmDelete(null);
    fetchData();
  };

  const handleEditClick = (tag) => {
    setEditingTag(tag.id);
    setEditPlateValue(tag.plate);
    setEditPhoneValue(tag.ownerPhone || "");
  };

  const handleSavePlate = async (tagId) => {
    if (editPlateValue.trim() !== "") {
      await updateTagInfo(tagId, editPlateValue.trim().toUpperCase(), editPhoneValue.trim());
      fetchData();
    }
    setEditingTag(null);
  };

  if (!authed) {
    return (
      <div className="glass-card" style={{textAlign: 'center', maxWidth: '400px', margin: '0 auto'}}>
        <ShieldCheck size={48} color="var(--accent-color)" style={{marginBottom: '16px'}} />
        <h2>Süper Admin Girişi</h2>
        <form onSubmit={handleLogin} style={{marginTop: '20px'}}>
          <input 
            type="password" 
            placeholder="Şifrenizi Girin" 
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{marginBottom: '16px'}}
          />
          <button type="submit" className="btn btn-primary">Giriş Yap</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h2>Admin Paneli</h2>
        <button className="btn btn-outline" onClick={() => setAuthed(false)} style={{padding: '6px 12px', fontSize: '0.8rem'}}>Çıkış</button>
      </div>

      <div style={{display: 'flex', gap: '16px', marginBottom: '32px'}}>
        <div style={{flex: 1, background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)'}}>
          <h3 style={{fontSize: '2rem', color: 'var(--accent-color)', margin: 0}}>{tags.length}</h3>
          <p style={{margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '0.9rem'}}>Toplam Etiket</p>
        </div>
        <div style={{flex: 1, background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)'}}>
          <h3 style={{fontSize: '2rem', color: '#10b981', margin: 0}}>{notifs.length}</h3>
          <p style={{margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '0.9rem'}}>Toplam Çağrı</p>
        </div>
      </div>

      <h3 style={{marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px'}}>Kayıtlı Plakalar</h3>
      {loading ? <p>Yükleniyor...</p> : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px'}}>
          {tags.map(t => (
            <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px'}}>
              <div>
                {editingTag === t.id ? (
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <input type="text" value={editPlateValue} onChange={(e) => setEditPlateValue(e.target.value)} placeholder="Plaka" style={{padding: '4px', borderRadius: '4px', border: '1px solid #ccc', color: 'black', width: '90px'}} />
                    <input type="tel" value={editPhoneValue} onChange={(e) => setEditPhoneValue(e.target.value)} placeholder="Telefon" style={{padding: '4px', borderRadius: '4px', border: '1px solid #ccc', color: 'black', width: '110px'}} />
                    <button onClick={() => handleSavePlate(t.id)} style={{background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>Kaydet</button>
                    <button onClick={() => setEditingTag(null)} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>İptal</button>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div>
                      <strong style={{color: 'white'}}>{t.plate}</strong>
                      <span style={{color: '#94a3b8', fontSize: '0.8rem', marginLeft: '12px'}}>ID: {t.tagId}</span>
                    </div>
                    {t.ownerPhone && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Sahip Tel: {t.ownerPhone}</span>}
                  </div>
                )}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                {editingTag !== t.id && (
                  <button onClick={() => handleEditClick(t)} style={{background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline'}}>Düzenle</button>
                )}
                {confirmDelete === t.id ? (
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <span style={{color: '#ef4444', fontSize: '0.8rem'}}>Emin misiniz?</span>
                    <button onClick={() => handleDeleteTag(t.id)} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>Evet</button>
                    <button onClick={() => setConfirmDelete(null)} style={{background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline'}}>İptal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(t.id)} style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline'}}>Sil (Boşa Çıkar)</button>
                )}
              </div>
            </div>
          ))}
          {tags.length === 0 && <p style={{color: '#94a3b8'}}>Henüz kayıtlı etiket yok.</p>}
        </div>
      )}
    </div>
  );
}

export default App;
