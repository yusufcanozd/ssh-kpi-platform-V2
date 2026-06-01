# SSH KPI Platform — Manuel Test Planı

Bu doküman, SSH KPI Platform üzerinde deploy sonrası manuel regresyon testi yapmak için hazırlanmıştır. Her senaryo, ilgili fonksiyonun kullanıcı gözüyle doğrulanmasını amaçlar.

## 1. Login / Logout

**Test adı:** Kullanıcı giriş ve çıkış akışı  
**Ön koşul:** Aktif bir kullanıcı hesabı bulunmalı.  
**Adımlar:**
1. `/login` sayfasını aç.
2. Geçerli e-posta ve şifre ile giriş yap.
3. Dashboard sayfasına yönlendirildiğini kontrol et.
4. Çıkış yap butonuna tıkla.
5. Tekrar `/login` sayfasına yönlendirildiğini kontrol et.

**Beklenen sonuç:** Kullanıcı başarılı şekilde giriş yapar, dashboard’a erişir ve çıkış sonrası korumalı sayfalara erişemez.  
**Risk seviyesi:** Yüksek

---

## 2. Hatalı Login Denemesi

**Test adı:** Hatalı kullanıcı bilgileriyle giriş engeli  
**Ön koşul:** Login sayfası erişilebilir olmalı.  
**Adımlar:**
1. `/login` sayfasını aç.
2. Yanlış e-posta veya yanlış şifre gir.
3. Giriş yapmayı dene.

**Beklenen sonuç:** Kullanıcı giriş yapamaz ve anlaşılır hata mesajı görür.  
**Risk seviyesi:** Orta

---

## 3. Admin Kullanıcı Yönetimi Görüntüleme

**Test adı:** Admin kullanıcı yönetimi sayfasına erişim  
**Ön koşul:** Admin veya superadmin rolüne sahip aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. Admin kullanıcıyla giriş yap.
2. Admin kullanıcı yönetimi sayfasını aç.
3. Kullanıcı listesinin yüklendiğini kontrol et.
4. Kullanıcı adı, e-posta, rol ve aktiflik bilgilerini kontrol et.

**Beklenen sonuç:** Yetkili kullanıcı listeyi görür; veriler boş veya hatalı görünmez.  
**Risk seviyesi:** Yüksek

---

## 4. Yetkisiz Admin Erişimi

**Test adı:** Normal kullanıcının admin sayfasına erişiminin engellenmesi  
**Ön koşul:** Normal `user` rolünde aktif kullanıcı bulunmalı.  
**Adımlar:**
1. Normal kullanıcı ile giriş yap.
2. Admin kullanıcı yönetimi sayfasına doğrudan URL ile gitmeyi dene.

**Beklenen sonuç:** Kullanıcı admin sayfasına erişemez; uygun şekilde dashboard’a veya yetkisiz erişim mesajına yönlendirilir.  
**Risk seviyesi:** Yüksek

---

## 5. Admin Kullanıcı Rol / Aktiflik Güncelleme

**Test adı:** Superadmin ile kullanıcı rolü veya aktiflik güncelleme  
**Ön koşul:** Superadmin rolünde aktif kullanıcı bulunmalı.  
**Adımlar:**
1. Superadmin olarak giriş yap.
2. Admin kullanıcı yönetimi sayfasını aç.
3. Test kullanıcısının rolünü değiştir.
4. Test kullanıcısını pasif/aktif yap.
5. Değişikliğin kaydedildiğini kontrol et.

**Beklenen sonuç:** Superadmin güncelleme yapabilir. Son aktif superadmin’in pasife alınması engellenir.  
**Risk seviyesi:** Yüksek

---

## 6. Dashboard Genel Skor Görüntüleme

**Test adı:** Ana dashboard genel skor kartları  
**Ön koşul:** Aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. `/dashboard` sayfasını aç.
2. Genel skor kartını kontrol et.
3. Kategori skorlarını kontrol et.
4. Skorların sayı formatında ve okunabilir renkle göründüğünü doğrula.

**Beklenen sonuç:** Genel skor ve kategori skorları hatasız görünür. Skorlar dinamik KPI motorundan gelir.  
**Risk seviyesi:** Yüksek

---

## 7. Genel Skor Metodoloji Tooltip’i

**Test adı:** Genel skor açıklama tooltip’i  
**Ön koşul:** Dashboard sayfası açık olmalı.  
**Adımlar:**
1. Genel skor alanındaki bilgi/tooltip ikonunu bul.
2. Tooltip’i aç.
3. Genel skor formülünü kontrol et.

**Beklenen sonuç:** Tooltip şu mantığı açıklar: Müşteri × 0.25 + Ticari × 0.25 + Operasyonel × 0.25 + Bayi × 0.15 + Kapsam × 0.10.  
**Risk seviyesi:** Orta

---

## 8. KPI Detay Sayfası

**Test adı:** KPI detay listesi ve skor bilgileri  
**Ön koşul:** Aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. KPI detay sayfasını aç.
2. 12 KPI’ın listelendiğini kontrol et.
3. Her KPI için skor, ham değer ve referans bilgisinin gösterildiğini kontrol et.
4. KPI 4 ve KPI 7 için yön bilgisinin “düşük daha iyi” olduğunu doğrula.

**Beklenen sonuç:** 12 KPI eksiksiz görünür; KPI yönleri doğru gösterilir.  
**Risk seviyesi:** Yüksek

---

## 9. KPI Formül Tooltip’i

**Test adı:** Tekil KPI formül açıklaması  
**Ön koşul:** KPI detay veya dashboard KPI kartları görünür olmalı.  
**Adımlar:**
1. Bir KPI tooltip’ini aç.
2. Ham değer, referans değer, skor, yön ve formül alanlarını kontrol et.
3. Yüksek-daha-iyi KPI için `değer / referans × 100` formülünü doğrula.
4. Düşük-daha-iyi KPI için `referans / değer × 100` formülünü doğrula.

**Beklenen sonuç:** Tooltip açıklaması doğru, kısa ve okunabilir olmalı.  
**Risk seviyesi:** Orta

---

## 10. Segment Filtresi

**Test adı:** Segment filtresi ile skorların değişmesi  
**Ön koşul:** Dashboard sayfası açık olmalı.  
**Adımlar:**
1. Segment filtresini aç.
2. `Mass`, `Premium`, `EV` seçeneklerini tek tek seç.
3. Genel skor, kategori skorları ve KPI değerlerinin değişip değişmediğini kontrol et.

**Beklenen sonuç:** Seçilen segmente göre dashboard verileri güncellenir.  
**Risk seviyesi:** Yüksek

---

## 11. Bölge Filtresi

**Test adı:** Bölge filtresi ile verilerin güncellenmesi  
**Ön koşul:** Dashboard sayfası açık olmalı.  
**Adımlar:**
1. Bölge filtresinden farklı bölgeler seç.
2. Skorların ve KPI değerlerinin güncellendiğini kontrol et.
3. Bölge seçimi kaldırıldığında tüm Türkiye görünümüne dönüldüğünü doğrula.

**Beklenen sonuç:** Bölge filtresi uygulandığında veriler doğru şekilde filtrelenir.  
**Risk seviyesi:** Yüksek

---

## 12. Yaş Grubu Filtresi

**Test adı:** Araç yaş grubu filtresi  
**Ön koşul:** Dashboard sayfası açık olmalı.  
**Adımlar:**
1. Yaş filtresinden `Tümü`, `0-3`, `3-7`, `7+` seçeneklerini dene.
2. Genel skor ve KPI değerlerinin değiştiğini kontrol et.

**Beklenen sonuç:** Yaş grubu seçimi dashboard skorlarına yansır.  
**Risk seviyesi:** Orta

---

## 13. Dönem Filtresi

**Test adı:** Dönem filtresi ile verilerin güncellenmesi  
**Ön koşul:** Dashboard sayfası açık olmalı.  
**Adımlar:**
1. Dönem filtresinden `2024-FY`, `2025-FY` ve çeyrek dönemleri seç.
2. Skorların dönem bazında güncellendiğini kontrol et.

**Beklenen sonuç:** Seçilen döneme göre skorlar ve KPI değerleri değişir.  
**Risk seviyesi:** Yüksek

---

## 14. Karşılaştırma Dönemi

**Test adı:** Karşılaştırma dönemi fark yüzdesi  
**Ön koşul:** Dashboard sayfasında karşılaştırma dönemi seçimi olmalı.  
**Adımlar:**
1. Ana dönem olarak `2025-FY` seç.
2. Karşılaştırma dönemi olarak `2024-FY` seç.
3. Değişim yüzdelerinin gösterildiğini kontrol et.
4. Pozitif/negatif değişim renklerini kontrol et.

**Beklenen sonuç:** Karşılaştırma yüzdesi doğru formatta görünür.  
**Risk seviyesi:** Orta

---

## 15. Marka Sıralaması

**Test adı:** Marka sıralaması sayfası  
**Ön koşul:** Aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. Marka sıralaması sayfasını aç.
2. Marka listesi, skor ve sıralama alanlarını kontrol et.
3. Segment/bölge/yaş/dönem filtrelerini değiştir.
4. Liste sıralamasının güncellendiğini kontrol et.

**Beklenen sonuç:** Marka skorları doğru listelenir; filtreler listeyi günceller.  
**Risk seviyesi:** Yüksek

---

## 16. Marka Skoru Metodoloji Açıklaması

**Test adı:** Marka skor kaynağı açıklaması  
**Ön koşul:** Marka sıralaması sayfası açık olmalı.  
**Adımlar:**
1. Marka sıralaması üstündeki açıklama alanını oku.
2. Marka skorunun `marka_scores.json` içindeki hazır genel skor olduğunu kontrol et.
3. Marka bazlı kategori/KPI kırılımı bulunmadığı bilgisinin gösterildiğini doğrula.

**Beklenen sonuç:** Kullanıcı marka skorunun kapsamını ve sınırını anlayabilir.  
**Risk seviyesi:** Orta

---

## 17. Marka Gizleme Kuralı

**Test adı:** 3 veya daha az marka olduğunda maskeleme  
**Ön koşul:** Filtrelerle 1, 2 veya 3 marka dönen bir kırılım bulunmalı.  
**Adımlar:**
1. Marka sıralaması sayfasında dar bir filtre kombinasyonu seç.
2. Marka sayısı 3 veya altına düşene kadar filtre uygula.
3. Marka adlarının `Gizli Teşebbüs 1`, `Gizli Teşebbüs 2` şeklinde maskelendiğini kontrol et.
4. 4 veya daha fazla marka dönen filtrede gerçek marka adlarının göründüğünü doğrula.

**Beklenen sonuç:** 1-3 marka için adlar maskelenir; 4+ marka için adlar gösterilir.  
**Risk seviyesi:** Yüksek

---

## 18. Bölge Analizi

**Test adı:** Bölge analizi sayfası  
**Ön koşul:** Aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. Bölge analizi sayfasını aç.
2. Bölgelerin listelendiğini veya grafik üzerinde göründüğünü kontrol et.
3. Segment, yaş ve dönem filtrelerini değiştir.
4. Bölge skorlarının güncellendiğini kontrol et.

**Beklenen sonuç:** Bölge analizi verileri filtrelere göre güncellenir. Bölge karşılaştırma referans mantığı ayrıca kontrol edilmelidir.  
**Risk seviyesi:** Yüksek

---

## 19. Trend Analizi

**Test adı:** Trend grafiği dönemsel görünüm  
**Ön koşul:** Trend sayfası erişilebilir olmalı.  
**Adımlar:**
1. Trend analizi sayfasını aç.
2. Dönemsel çizgi/grafik verilerinin göründüğünü kontrol et.
3. Segment ve KPI seçimlerini değiştir.
4. Grafiğin güncellendiğini kontrol et.

**Beklenen sonuç:** Trend grafiği filtrelere göre doğru şekilde değişir.  
**Risk seviyesi:** Orta

---

## 20. Özet Rapor Görüntüleme

**Test adı:** Özet rapor sayfası  
**Ön koşul:** Aktif kullanıcı ile giriş yapılmış olmalı.  
**Adımlar:**
1. Özet rapor sayfasını aç.
2. Kapak, genel skor, KPI detay, marka/bölge/trend bölümlerini kontrol et.
3. Sayfada kırık grafik veya boş bölüm olmadığını doğrula.

**Beklenen sonuç:** Özet rapor tüm bölümleriyle görüntülenir.  
**Risk seviyesi:** Yüksek

---

## 21. Özet Rapor Yazdırma / PDF Alma

**Test adı:** Özet rapor yazdırma görünümü  
**Ön koşul:** Özet rapor sayfası açık olmalı.  
**Adımlar:**
1. Yazdır/PDF al butonuna tıkla.
2. Tarayıcı yazdırma ekranını aç.
3. Sayfa taşması, kırık tablo veya bozuk başlık olup olmadığını kontrol et.
4. Üstbilgi/altbilgi kapatma notunun göründüğünü kontrol et.

**Beklenen sonuç:** Rapor yazdırma görünümü düzgün olur.  
**Risk seviyesi:** Orta

---

## 22. AI Yorum Üretimi

**Test adı:** AI commentary endpoint ile yorum üretimi  
**Ön koşul:** Aktif kullanıcı giriş yapmış olmalı ve `ANTHROPIC_API_KEY` tanımlı olmalı.  
**Adımlar:**
1. AI yorum üretimi bulunan ekrana git.
2. Geçerli dashboard verisiyle yorum üretmeyi dene.
3. Dönen metnin ekranda göründüğünü kontrol et.

**Beklenen sonuç:** Aktif ve login kullanıcı AI yorumu alabilir. Response formatı bozulmaz.  
**Risk seviyesi:** Yüksek

---

## 23. AI Endpoint Yetkisiz Erişim

**Test adı:** Login olmayan kullanıcı AI endpoint kullanamaz  
**Ön koşul:** Kullanıcı logout durumda olmalı.  
**Adımlar:**
1. AI yorum üretimi endpoint’ine istek atmayı dene.
2. Uygulama arayüzünden veya API test aracıyla kontrol et.

**Beklenen sonuç:** Endpoint `401 Unauthorized` döner.  
**Risk seviyesi:** Yüksek

---

## 24. AI Endpoint Pasif Kullanıcı

**Test adı:** Pasif kullanıcının AI endpoint erişimi  
**Ön koşul:** `is_active=false` olan kullanıcı bulunmalı.  
**Adımlar:**
1. Pasif kullanıcı ile giriş yapmayı veya endpoint çağırmayı dene.
2. AI yorum üretimi isteği gönder.

**Beklenen sonuç:** Endpoint `403 Forbidden` döner.  
**Risk seviyesi:** Yüksek

---

## 25. AI Rate Limit

**Test adı:** AI endpoint rate limit kontrolü  
**Ön koşul:** Aktif kullanıcı giriş yapmış olmalı.  
**Adımlar:**
1. Kısa süre içinde AI yorum endpoint’ine çok sayıda istek gönder.
2. Limit aşıldığında dönen hatayı kontrol et.

**Beklenen sonuç:** Limit aşıldığında `429 Too Many Requests` veya benzeri güvenli hata döner.  
**Risk seviyesi:** Orta

---

## 26. Eksik Veri / Coverage Gösterimi

**Test adı:** Coverage oranı ve eksik KPI bilgisi  
**Ön koşul:** Eksik KPI değeri olan veya test için simüle edilmiş kırılım bulunmalı.  
**Adımlar:**
1. Eksik veri içerebilecek dar filtre kombinasyonu seç.
2. Coverage göstergesini kontrol et.
3. Eksik KPI’ların kategori ortalamasından çıkarıldığını doğrula.
4. Hiç geçerli KPI olmayan kategoride skorun 100 kabul edildiğini ama coverage’ın düştüğünü kontrol et.

**Beklenen sonuç:** Eksik veri kullanıcıya şeffaf şekilde gösterilir.  
**Risk seviyesi:** Yüksek

---

## 27. Skor Sınırı Kontrolü

**Test adı:** Skorun 0–200 aralığında kalması  
**Ön koşul:** KPI detay veya dashboard ekranı açık olmalı.  
**Adımlar:**
1. Farklı filtre kombinasyonlarında KPI skorlarını kontrol et.
2. Hiçbir skorun 0 altına veya 200 üstüne çıkmadığını doğrula.
3. Tooltip’te 200 tavan sınırı bilgisinin bulunduğunu kontrol et.

**Beklenen sonuç:** Skorlar 0–200 aralığında kalır.  
**Risk seviyesi:** Orta

---

## 28. Responsive Mobil Görünüm

**Test adı:** Mobil dashboard görünümü  
**Ön koşul:** Tarayıcı geliştirici araçları veya gerçek mobil cihaz kullanılmalı.  
**Adımlar:**
1. Ekranı mobil genişliğe al.
2. Dashboard, KPI detay, marka sıralaması, trend ve özet rapor sayfalarını aç.
3. Kartların, tabloların ve grafiklerin taşmadığını kontrol et.
4. Menü ve filtrelerin kullanılabilir olduğunu doğrula.

**Beklenen sonuç:** Mobilde yatay taşma ve okunamaz UI olmamalı.  
**Risk seviyesi:** Orta

---

## 29. Korumalı Sayfalara Yetkisiz Erişim

**Test adı:** Login olmayan kullanıcı dashboard’a erişemez  
**Ön koşul:** Kullanıcı logout durumda olmalı.  
**Adımlar:**
1. Doğrudan `/dashboard` URL’sine git.
2. Diğer dashboard alt sayfalarına doğrudan gitmeyi dene.

**Beklenen sonuç:** Kullanıcı `/login` sayfasına yönlendirilir veya erişim engellenir.  
**Risk seviyesi:** Yüksek

---

## 30. Pasif Kullanıcı Erişimi

**Test adı:** Pasif kullanıcının uygulama erişimi  
**Ön koşul:** `is_active=false` olan test kullanıcısı bulunmalı.  
**Adımlar:**
1. Pasif kullanıcı ile giriş yapmayı dene.
2. Giriş yapılabiliyorsa dashboard’a erişmeyi dene.
3. API isteklerini kontrol et.

**Beklenen sonuç:** Pasif kullanıcı dashboard ve kritik API’lere erişememeli.  
**Risk seviyesi:** Yüksek

---

## 31. README / METHODOLOGY Linkleri

**Test adı:** Dokümantasyon linklerinin doğrulanması  
**Ön koşul:** GitHub repository erişilebilir olmalı.  
**Adımlar:**
1. `README.md` dosyasını aç.
2. `METHODOLOGY.md`, `SUPABASE.md`, `STRICT_TODO.md` linklerini kontrol et.
3. Linklerin doğru dosyalara gittiğini doğrula.

**Beklenen sonuç:** Dokümantasyon linkleri kırık olmamalı.  
**Risk seviyesi:** Düşük

---

## 32. score_cube Runtime Kullanımı Kontrolü

**Test adı:** Runtime skor kaynağı kontrolü  
**Ön koşul:** Geliştirici ortamında proje kodu erişilebilir olmalı.  
**Adımlar:**
1. Kod içinde `score_cube` araması yap.
2. Skor hesaplama fonksiyonlarında `score_cube` lookup kalmadığını kontrol et.
3. `score_cube` sadece JSON legacy alanı, yorumlar veya dokümantasyonda kalmalı.

**Beklenen sonuç:** Kullanıcıya gösterilen skorlar dinamik KPI motorundan üretilir.  
**Risk seviyesi:** Yüksek

---

## 33. getScore / getScoreDetailed Tutarlılığı

**Test adı:** Skor fonksiyonları arasında tutarlılık  
**Ön koşul:** Test ortamı veya geliştirici konsolu erişilebilir olmalı.  
**Adımlar:**
1. Aynı segment/bölge/yaş/dönem için `getScore` çağır.
2. Aynı filtrelerle `getScoreDetailed` çağır.
3. Genel ve kategori skorlarının aynı olduğunu kontrol et.

**Beklenen sonuç:** `getScore` ve `getScoreDetailed` skorları tutarlıdır; sadece detay alanları farklıdır.  
**Risk seviyesi:** Yüksek

---

## 34. Smoke Test — Ana Kullanıcı Akışı

**Test adı:** Uçtan uca temel kullanım akışı  
**Ön koşul:** Aktif kullanıcı hesabı bulunmalı.  
**Adımlar:**
1. Login ol.
2. Dashboard’u aç.
3. Segment, bölge, yaş ve dönem filtrelerini değiştir.
4. KPI detay sayfasına git.
5. Marka sıralaması sayfasına git.
6. Trend sayfasına git.
7. Özet raporu aç.
8. Logout ol.

**Beklenen sonuç:** Uygulama hiçbir adımda hata vermeden temel akışı tamamlar.  
**Risk seviyesi:** Yüksek
