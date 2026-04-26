export type LangCode =
  | "en" | "sr" | "zh" | "ar" | "ru"
  | "de" | "fr" | "es" | "it" | "pt"
  | "nl" | "pl" | "sv" | "tr";

export interface LangMeta {
  name: string;
  native: string;
  flag: string;
  rtl?: boolean;
}

export const LANGUAGES: Record<LangCode, LangMeta> = {
  en: { name: "English",    native: "English",    flag: "🇬🇧" },
  sr: { name: "Serbian",    native: "Srpski",      flag: "🇷🇸" },
  zh: { name: "Chinese",    native: "中文",         flag: "🇨🇳" },
  ar: { name: "Arabic",     native: "العربية",     flag: "🇸🇦", rtl: true },
  ru: { name: "Russian",    native: "Русский",     flag: "🇷🇺" },
  de: { name: "German",     native: "Deutsch",     flag: "🇩🇪" },
  fr: { name: "French",     native: "Français",    flag: "🇫🇷" },
  es: { name: "Spanish",    native: "Español",     flag: "🇪🇸" },
  it: { name: "Italian",    native: "Italiano",    flag: "🇮🇹" },
  pt: { name: "Portuguese", native: "Português",   flag: "🇵🇹" },
  nl: { name: "Dutch",      native: "Nederlands",  flag: "🇳🇱" },
  pl: { name: "Polish",     native: "Polski",      flag: "🇵🇱" },
  sv: { name: "Swedish",    native: "Svenska",     flag: "🇸🇪" },
  tr: { name: "Turkish",    native: "Türkçe",      flag: "🇹🇷" },
};

export interface Translations {
  nav: { home: string; chats: string; market: string; wallet: string; profile: string };
  home: {
    balance: string; quickActions: string;
    buy: string; sell: string; send: string;
    vouchers: string; voucherSub: string;
    invite: string; inviteSub: string;
  };
  wallet: {
    title: string; deposit: string; send: string;
    balance: string; myAddresses: string; addAddress: string;
    cashOut: string; sellViaMarket: string;
  };
  market: { title: string; noListings: string; postListing: string; sell: string };
  profile: {
    title: string; signOut: string; language: string; theme: string;
    chooseTheme: string; referral: string; referralSub: string;
    redeemBtn: string; notifSound: string; adminPanel: string;
    copyInvite: string; copied: string;
    showMarket: string; showMarketSub: string;
  };
  common: {
    save: string; cancel: string; confirm: string;
    loading: string; error: string; close: string;
    contact: string; buy: string;
  };
}

const T: Record<LangCode, Translations> = {
  en: {
    nav: { home: "Home", chats: "Chats", market: "Market", wallet: "Wallet", profile: "Profile" },
    home: { balance: "Your Balance", quickActions: "Quick Actions", buy: "Buy", sell: "Sell", send: "Send", vouchers: "Volegram Vouchers", voucherSub: "Buy · Send · Redeem · Any currency", invite: "Invite Friends", inviteSub: "No KYC · Zero sign-up" },
    wallet: { title: "Wallet", deposit: "Top Up", send: "Send", balance: "Balance", myAddresses: "My Crypto Addresses", addAddress: "Add", cashOut: "Cash Out", sellViaMarket: "Sell via Market" },
    market: { title: "Market", noListings: "No listings yet", postListing: "Post Listing", sell: "Sell" },
    profile: { title: "Profile", signOut: "Sign Out", language: "Language", theme: "Theme", chooseTheme: "Choose app color scheme", referral: "Referral Code", referralSub: "Enter code to get bonus sats", redeemBtn: "Redeem", notifSound: "Notification Sound", adminPanel: "Admin Panel", copyInvite: "Copy Invite Link", copied: "Copied!", showMarket: "Show P2P Market", showMarketSub: "Show/hide Market tab in navigation" },
    common: { save: "Save", cancel: "Cancel", confirm: "Confirm", loading: "Loading…", error: "Error", close: "Close", contact: "Contact", buy: "Buy" },
  },
  sr: {
    nav: { home: "Početna", chats: "Poruke", market: "Tržište", wallet: "Novčanik", profile: "Profil" },
    home: { balance: "Stanje", quickActions: "Brze akcije", buy: "Kupi", sell: "Prodaj", send: "Pošalji", vouchers: "Volegram Vaučeri", voucherSub: "Kupi · Pošalji · Iskoristi · Svaka valuta", invite: "Pozovi prijatelje", inviteSub: "Bez KYC · Bez registracije" },
    wallet: { title: "Novčanik", deposit: "Dopuni", send: "Pošalji", balance: "Stanje", myAddresses: "Moje kripto adrese", addAddress: "Dodaj", cashOut: "Isplata", sellViaMarket: "Prodaj na tržištu" },
    market: { title: "Tržište", noListings: "Nema oglasa", postListing: "Postavi oglas", sell: "Prodaj" },
    profile: { title: "Profil", signOut: "Odjavi se", language: "Jezik", theme: "Tema", chooseTheme: "Izaberi boju aplikacije", referral: "Referral kod", referralSub: "Unesi kod i dobij bonus sats", redeemBtn: "Iskoristi", notifSound: "Zvuk obaveštenja", adminPanel: "Admin Panel", copyInvite: "Kopiraj pozivnicu", copied: "Kopirano!", showMarket: "Prikaži P2P tržište", showMarketSub: "Prikaži/sakrij tab Tržište u navigaciji" },
    common: { save: "Sačuvaj", cancel: "Otkaži", confirm: "Potvrdi", loading: "Učitavanje…", error: "Greška", close: "Zatvori", contact: "Kontaktiraj", buy: "Kupi" },
  },
  zh: {
    nav: { home: "主页", chats: "聊天", market: "市场", wallet: "钱包", profile: "我的" },
    home: { balance: "余额", quickActions: "快捷操作", buy: "购买", sell: "出售", send: "发送", vouchers: "Volegram 礼券", voucherSub: "购买 · 发送 · 兑换 · 任何货币", invite: "邀请好友", inviteSub: "无KYC · 零注册" },
    wallet: { title: "钱包", deposit: "充值", send: "发送", balance: "余额", myAddresses: "我的加密地址", addAddress: "添加", cashOut: "提现", sellViaMarket: "通过市场出售" },
    market: { title: "市场", noListings: "暂无挂单", postListing: "发布挂单", sell: "出售" },
    profile: { title: "我的", signOut: "退出", language: "语言", theme: "主题", chooseTheme: "选择应用配色", referral: "推荐码", referralSub: "输入推荐码获得奖励", redeemBtn: "兑换", notifSound: "通知声音", adminPanel: "管理员面板", copyInvite: "复制邀请链接", copied: "已复制！", showMarket: "显示P2P市场", showMarketSub: "在导航中显示/隐藏市场标签" },
    common: { save: "保存", cancel: "取消", confirm: "确认", loading: "加载中…", error: "错误", close: "关闭", contact: "联系", buy: "购买" },
  },
  ar: {
    nav: { home: "الرئيسية", chats: "الدردشة", market: "السوق", wallet: "المحفظة", profile: "الملف" },
    home: { balance: "رصيدك", quickActions: "إجراءات سريعة", buy: "شراء", sell: "بيع", send: "إرسال", vouchers: "قسائم Volegram", voucherSub: "شراء · إرسال · استرداد · أي عملة", invite: "دعو الأصدقاء", inviteSub: "بدون KYC · تسجيل فوري" },
    wallet: { title: "المحفظة", deposit: "إيداع", send: "إرسال", balance: "الرصيد", myAddresses: "عناويني المشفرة", addAddress: "إضافة", cashOut: "سحب", sellViaMarket: "بيع عبر السوق" },
    market: { title: "السوق", noListings: "لا توجد قوائم", postListing: "نشر قائمة", sell: "بيع" },
    profile: { title: "الملف الشخصي", signOut: "تسجيل الخروج", language: "اللغة", theme: "المظهر", chooseTheme: "اختر نظام ألوان التطبيق", referral: "رمز الإحالة", referralSub: "أدخل الرمز للحصول على مكافأة", redeemBtn: "استرداد", notifSound: "صوت الإشعار", adminPanel: "لوحة الإدارة", copyInvite: "نسخ رابط الدعوة", copied: "تم النسخ!", showMarket: "إظهار سوق P2P", showMarketSub: "إظهار/إخفاء علامة السوق في التنقل" },
    common: { save: "حفظ", cancel: "إلغاء", confirm: "تأكيد", loading: "جاري التحميل…", error: "خطأ", close: "إغلاق", contact: "تواصل", buy: "شراء" },
  },
  ru: {
    nav: { home: "Главная", chats: "Чаты", market: "Рынок", wallet: "Кошелёк", profile: "Профиль" },
    home: { balance: "Баланс", quickActions: "Быстрые действия", buy: "Купить", sell: "Продать", send: "Отправить", vouchers: "Ваучеры Volegram", voucherSub: "Купить · Отправить · Погасить · Любая валюта", invite: "Пригласить друзей", inviteSub: "Без KYC · Без регистрации" },
    wallet: { title: "Кошелёк", deposit: "Пополнить", send: "Отправить", balance: "Баланс", myAddresses: "Мои криптоадреса", addAddress: "Добавить", cashOut: "Вывод", sellViaMarket: "Продать через рынок" },
    market: { title: "Рынок", noListings: "Объявлений нет", postListing: "Разместить", sell: "Продать" },
    profile: { title: "Профиль", signOut: "Выйти", language: "Язык", theme: "Тема", chooseTheme: "Выберите цветовую схему", referral: "Реферальный код", referralSub: "Введите код и получите бонус", redeemBtn: "Активировать", notifSound: "Звук уведомлений", adminPanel: "Панель администратора", copyInvite: "Скопировать ссылку", copied: "Скопировано!", showMarket: "Показать P2P рынок", showMarketSub: "Показать/скрыть вкладку Рынок" },
    common: { save: "Сохранить", cancel: "Отмена", confirm: "Подтвердить", loading: "Загрузка…", error: "Ошибка", close: "Закрыть", contact: "Связаться", buy: "Купить" },
  },
  de: {
    nav: { home: "Start", chats: "Chats", market: "Markt", wallet: "Wallet", profile: "Profil" },
    home: { balance: "Guthaben", quickActions: "Schnellaktionen", buy: "Kaufen", sell: "Verkaufen", send: "Senden", vouchers: "Volegram Gutscheine", voucherSub: "Kaufen · Senden · Einlösen · Jede Währung", invite: "Freunde einladen", inviteSub: "Kein KYC · Null Anmeldung" },
    wallet: { title: "Wallet", deposit: "Aufladen", send: "Senden", balance: "Guthaben", myAddresses: "Meine Krypto-Adressen", addAddress: "Hinzufügen", cashOut: "Auszahlen", sellViaMarket: "Über Markt verkaufen" },
    market: { title: "Markt", noListings: "Keine Angebote", postListing: "Angebot erstellen", sell: "Verkaufen" },
    profile: { title: "Profil", signOut: "Abmelden", language: "Sprache", theme: "Design", chooseTheme: "Farbschema wählen", referral: "Referral-Code", referralSub: "Code eingeben und Bonus erhalten", redeemBtn: "Einlösen", notifSound: "Benachrichtigungston", adminPanel: "Admin-Bereich", copyInvite: "Einladungslink kopieren", copied: "Kopiert!", showMarket: "P2P-Markt anzeigen", showMarketSub: "Markt-Tab in Navigation ein-/ausblenden" },
    common: { save: "Speichern", cancel: "Abbrechen", confirm: "Bestätigen", loading: "Laden…", error: "Fehler", close: "Schließen", contact: "Kontakt", buy: "Kaufen" },
  },
  fr: {
    nav: { home: "Accueil", chats: "Messages", market: "Marché", wallet: "Portefeuille", profile: "Profil" },
    home: { balance: "Solde", quickActions: "Actions rapides", buy: "Acheter", sell: "Vendre", send: "Envoyer", vouchers: "Bons Volegram", voucherSub: "Acheter · Envoyer · Échanger · Toute devise", invite: "Inviter des amis", inviteSub: "Sans KYC · Zéro inscription" },
    wallet: { title: "Portefeuille", deposit: "Recharger", send: "Envoyer", balance: "Solde", myAddresses: "Mes adresses crypto", addAddress: "Ajouter", cashOut: "Retirer", sellViaMarket: "Vendre via le marché" },
    market: { title: "Marché", noListings: "Aucune annonce", postListing: "Publier", sell: "Vendre" },
    profile: { title: "Profil", signOut: "Déconnexion", language: "Langue", theme: "Thème", chooseTheme: "Choisir le thème", referral: "Code de parrainage", referralSub: "Entrez le code et obtenez un bonus", redeemBtn: "Utiliser", notifSound: "Son de notification", adminPanel: "Panel admin", copyInvite: "Copier le lien", copied: "Copié!", showMarket: "Afficher le marché P2P", showMarketSub: "Afficher/masquer l'onglet Marché" },
    common: { save: "Sauvegarder", cancel: "Annuler", confirm: "Confirmer", loading: "Chargement…", error: "Erreur", close: "Fermer", contact: "Contacter", buy: "Acheter" },
  },
  es: {
    nav: { home: "Inicio", chats: "Chats", market: "Mercado", wallet: "Billetera", profile: "Perfil" },
    home: { balance: "Saldo", quickActions: "Acciones rápidas", buy: "Comprar", sell: "Vender", send: "Enviar", vouchers: "Vales Volegram", voucherSub: "Comprar · Enviar · Canjear · Cualquier moneda", invite: "Invitar amigos", inviteSub: "Sin KYC · Sin registro" },
    wallet: { title: "Billetera", deposit: "Recargar", send: "Enviar", balance: "Saldo", myAddresses: "Mis direcciones cripto", addAddress: "Agregar", cashOut: "Retirar", sellViaMarket: "Vender en el mercado" },
    market: { title: "Mercado", noListings: "Sin anuncios", postListing: "Publicar", sell: "Vender" },
    profile: { title: "Perfil", signOut: "Cerrar sesión", language: "Idioma", theme: "Tema", chooseTheme: "Elegir esquema de color", referral: "Código de referido", referralSub: "Ingresa el código y obtén bonus", redeemBtn: "Canjear", notifSound: "Sonido de notificación", adminPanel: "Panel de admin", copyInvite: "Copiar enlace", copied: "¡Copiado!", showMarket: "Mostrar mercado P2P", showMarketSub: "Mostrar/ocultar pestaña de mercado" },
    common: { save: "Guardar", cancel: "Cancelar", confirm: "Confirmar", loading: "Cargando…", error: "Error", close: "Cerrar", contact: "Contactar", buy: "Comprar" },
  },
  it: {
    nav: { home: "Home", chats: "Chat", market: "Mercato", wallet: "Portafoglio", profile: "Profilo" },
    home: { balance: "Saldo", quickActions: "Azioni rapide", buy: "Acquista", sell: "Vendi", send: "Invia", vouchers: "Voucher Volegram", voucherSub: "Acquista · Invia · Riscatta · Qualsiasi valuta", invite: "Invita amici", inviteSub: "Senza KYC · Zero registrazione" },
    wallet: { title: "Portafoglio", deposit: "Ricarica", send: "Invia", balance: "Saldo", myAddresses: "I miei indirizzi crypto", addAddress: "Aggiungi", cashOut: "Preleva", sellViaMarket: "Vendi tramite mercato" },
    market: { title: "Mercato", noListings: "Nessun annuncio", postListing: "Pubblica", sell: "Vendi" },
    profile: { title: "Profilo", signOut: "Esci", language: "Lingua", theme: "Tema", chooseTheme: "Scegli la combinazione colori", referral: "Codice referral", referralSub: "Inserisci il codice per ottenere bonus", redeemBtn: "Riscatta", notifSound: "Suono notifica", adminPanel: "Pannello admin", copyInvite: "Copia link invito", copied: "Copiato!", showMarket: "Mostra mercato P2P", showMarketSub: "Mostra/nascondi il tab Mercato" },
    common: { save: "Salva", cancel: "Annulla", confirm: "Conferma", loading: "Caricamento…", error: "Errore", close: "Chiudi", contact: "Contatta", buy: "Acquista" },
  },
  pt: {
    nav: { home: "Início", chats: "Mensagens", market: "Mercado", wallet: "Carteira", profile: "Perfil" },
    home: { balance: "Saldo", quickActions: "Ações rápidas", buy: "Comprar", sell: "Vender", send: "Enviar", vouchers: "Vouchers Volegram", voucherSub: "Comprar · Enviar · Resgatar · Qualquer moeda", invite: "Convidar amigos", inviteSub: "Sem KYC · Zero cadastro" },
    wallet: { title: "Carteira", deposit: "Recarregar", send: "Enviar", balance: "Saldo", myAddresses: "Meus endereços cripto", addAddress: "Adicionar", cashOut: "Sacar", sellViaMarket: "Vender no mercado" },
    market: { title: "Mercado", noListings: "Sem anúncios", postListing: "Publicar", sell: "Vender" },
    profile: { title: "Perfil", signOut: "Sair", language: "Idioma", theme: "Tema", chooseTheme: "Escolha o esquema de cores", referral: "Código de referência", referralSub: "Insira o código para ganhar bônus", redeemBtn: "Resgatar", notifSound: "Som de notificação", adminPanel: "Painel admin", copyInvite: "Copiar link", copied: "Copiado!", showMarket: "Mostrar mercado P2P", showMarketSub: "Mostrar/ocultar aba de mercado" },
    common: { save: "Salvar", cancel: "Cancelar", confirm: "Confirmar", loading: "Carregando…", error: "Erro", close: "Fechar", contact: "Contatar", buy: "Comprar" },
  },
  nl: {
    nav: { home: "Start", chats: "Chats", market: "Markt", wallet: "Portemonnee", profile: "Profiel" },
    home: { balance: "Saldo", quickActions: "Snelle acties", buy: "Kopen", sell: "Verkopen", send: "Versturen", vouchers: "Volegram Vouchers", voucherSub: "Kopen · Versturen · Inwisselen · Elke valuta", invite: "Vrienden uitnodigen", inviteSub: "Geen KYC · Zero aanmelding" },
    wallet: { title: "Portemonnee", deposit: "Opladen", send: "Versturen", balance: "Saldo", myAddresses: "Mijn crypto-adressen", addAddress: "Toevoegen", cashOut: "Opnemen", sellViaMarket: "Verkopen via markt" },
    market: { title: "Markt", noListings: "Geen aanbiedingen", postListing: "Plaatsen", sell: "Verkopen" },
    profile: { title: "Profiel", signOut: "Uitloggen", language: "Taal", theme: "Thema", chooseTheme: "Kies kleurenschema", referral: "Referralcode", referralSub: "Code invoeren voor bonussats", redeemBtn: "Inwisselen", notifSound: "Meldingsgeluid", adminPanel: "Beheerderspaneel", copyInvite: "Link kopiëren", copied: "Gekopieerd!", showMarket: "P2P-markt tonen", showMarketSub: "Markttab tonen/verbergen" },
    common: { save: "Opslaan", cancel: "Annuleren", confirm: "Bevestigen", loading: "Laden…", error: "Fout", close: "Sluiten", contact: "Contact", buy: "Kopen" },
  },
  pl: {
    nav: { home: "Strona główna", chats: "Czaty", market: "Rynek", wallet: "Portfel", profile: "Profil" },
    home: { balance: "Saldo", quickActions: "Szybkie akcje", buy: "Kup", sell: "Sprzedaj", send: "Wyślij", vouchers: "Vouchery Volegram", voucherSub: "Kup · Wyślij · Zrealizuj · Każda waluta", invite: "Zaproś znajomych", inviteSub: "Bez KYC · Zero rejestracji" },
    wallet: { title: "Portfel", deposit: "Doładuj", send: "Wyślij", balance: "Saldo", myAddresses: "Moje adresy krypto", addAddress: "Dodaj", cashOut: "Wypłać", sellViaMarket: "Sprzedaj przez rynek" },
    market: { title: "Rynek", noListings: "Brak ogłoszeń", postListing: "Dodaj ogłoszenie", sell: "Sprzedaj" },
    profile: { title: "Profil", signOut: "Wyloguj", language: "Język", theme: "Motyw", chooseTheme: "Wybierz schemat kolorów", referral: "Kod polecający", referralSub: "Wpisz kod, aby otrzymać bonus", redeemBtn: "Zrealizuj", notifSound: "Dźwięk powiadomień", adminPanel: "Panel administratora", copyInvite: "Kopiuj link zaproszenia", copied: "Skopiowano!", showMarket: "Pokaż rynek P2P", showMarketSub: "Pokaż/ukryj kartę Rynek" },
    common: { save: "Zapisz", cancel: "Anuluj", confirm: "Potwierdź", loading: "Ładowanie…", error: "Błąd", close: "Zamknij", contact: "Kontakt", buy: "Kup" },
  },
  sv: {
    nav: { home: "Hem", chats: "Chattar", market: "Marknad", wallet: "Plånbok", profile: "Profil" },
    home: { balance: "Saldo", quickActions: "Snabbåtgärder", buy: "Köp", sell: "Sälj", send: "Skicka", vouchers: "Volegram-kuponger", voucherSub: "Köp · Skicka · Lös in · Vilken valuta som helst", invite: "Bjud in vänner", inviteSub: "Ingen KYC · Noll registrering" },
    wallet: { title: "Plånbok", deposit: "Ladda på", send: "Skicka", balance: "Saldo", myAddresses: "Mina kryptoadresser", addAddress: "Lägg till", cashOut: "Ta ut", sellViaMarket: "Sälj via marknaden" },
    market: { title: "Marknad", noListings: "Inga annonser", postListing: "Publicera", sell: "Sälj" },
    profile: { title: "Profil", signOut: "Logga ut", language: "Språk", theme: "Tema", chooseTheme: "Välj färgschema", referral: "Referenskod", referralSub: "Ange kod och få bonussats", redeemBtn: "Lös in", notifSound: "Aviseringsljud", adminPanel: "Adminpanel", copyInvite: "Kopiera inbjudningslänk", copied: "Kopierat!", showMarket: "Visa P2P-marknad", showMarketSub: "Visa/dölj marknadsfliken" },
    common: { save: "Spara", cancel: "Avbryt", confirm: "Bekräfta", loading: "Laddar…", error: "Fel", close: "Stäng", contact: "Kontakta", buy: "Köp" },
  },
  tr: {
    nav: { home: "Ana Sayfa", chats: "Sohbetler", market: "Pazar", wallet: "Cüzdan", profile: "Profil" },
    home: { balance: "Bakiye", quickActions: "Hızlı İşlemler", buy: "Satın Al", sell: "Sat", send: "Gönder", vouchers: "Volegram Kuponları", voucherSub: "Satın Al · Gönder · Kullan · Her para birimi", invite: "Arkadaşlarını Davet Et", inviteSub: "KYC yok · Kayıt yok" },
    wallet: { title: "Cüzdan", deposit: "Yükle", send: "Gönder", balance: "Bakiye", myAddresses: "Kripto Adreslerim", addAddress: "Ekle", cashOut: "Çek", sellViaMarket: "Pazar üzerinden sat" },
    market: { title: "Pazar", noListings: "İlan yok", postListing: "İlan Ver", sell: "Sat" },
    profile: { title: "Profil", signOut: "Çıkış Yap", language: "Dil", theme: "Tema", chooseTheme: "Renk şemasını seç", referral: "Referans Kodu", referralSub: "Kodu gir, bonus sats kazan", redeemBtn: "Kullan", notifSound: "Bildirim Sesi", adminPanel: "Yönetici Paneli", copyInvite: "Davet Linkini Kopyala", copied: "Kopyalandı!", showMarket: "P2P Pazarı Göster", showMarketSub: "Pazar sekmesini göster/gizle" },
    common: { save: "Kaydet", cancel: "İptal", confirm: "Onayla", loading: "Yükleniyor…", error: "Hata", close: "Kapat", contact: "İletişim", buy: "Satın Al" },
  },
};

export function t(lang: LangCode): Translations {
  return T[lang] ?? T.en;
}

export function isRTL(lang: LangCode): boolean {
  return LANGUAGES[lang]?.rtl === true;
}

export function getStoredLang(): LangCode {
  const v = localStorage.getItem("vbc-lang") as LangCode | null;
  return v && v in LANGUAGES ? v : "en";
}

export function setStoredLang(lang: LangCode) {
  localStorage.setItem("vbc-lang", lang);
}
