/* API هم‌مبدأ برای عبور از محدودیت دسترسی بعضی اپراتورها به workers.dev.
   در Cloudflare برای همین Worker یک Route با الگوی love.bytelabpro.xyz/api* تعریف کنید.
   متغیر ORIGIN در Worker باید دقیقاً https://love.bytelabpro.xyz باشد. */
window.OURHOME_API = window.location.origin;
