const messages = {
  en: {
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'Your account does not have access to this information.',
    notFound: 'The requested healthcare information could not be found.',
    server: 'Dr.250 is temporarily unable to complete this request.',
    network: 'Dr.250 could not be reached. Check your connection and try again.',
  },
  bn: {
    unauthorized: 'আপনার সেশনের মেয়াদ শেষ হয়েছে। আবার সাইন ইন করুন।',
    forbidden: 'এই তথ্য দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।',
    notFound: 'অনুরোধ করা স্বাস্থ্যতথ্য পাওয়া যায়নি।',
    server: 'Dr.250 সাময়িকভাবে এই অনুরোধ সম্পন্ন করতে পারছে না।',
    network: 'Dr.250-এর সাথে সংযোগ করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
  },
};

export function getApiErrorMessage(error, language = 'en', fallback) {
  const copy = messages[language] ?? messages.en;
  if (error?.code === 'NETWORK_ERROR' || error?.status === 0) return copy.network;
  if (error?.status === 401) return copy.unauthorized;
  if (error?.status === 403) return copy.forbidden;
  if (error?.status === 404) return copy.notFound;
  if (error?.status >= 500) return copy.server;
  return error?.message || fallback || copy.server;
}
