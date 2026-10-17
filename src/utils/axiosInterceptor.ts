import axios from 'axios';


// اضافه کردن timestamp به همه درخواست‌های Axios برای دور زدن Cache
axios.interceptors.request.use((config) => {
  // فقط به درخواست‌های GET timestamp اضافه کن
  if (config.method === 'get') {
    const timestamp = Date.now();
    
    // اگر URL قبلاً query parameter دارد
    if (config.url?.includes('?')) {
      config.url = `${config.url}&t=${timestamp}`;
    } else {
      config.url = `${config.url}?t=${timestamp}`;
    }
  }
  
  return config;
});


export default axios;