const isProduction = !['localhost', '127.0.0.1'].includes(location.hostname);

if (!isProduction) {
  await import('@aiforui/lapse/install');
  const { mountLapse } = await import('@aiforui/lapse/panel');
  mountLapse();
}
