function updateClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  clockEl.textContent = `${hours} : ${minutes} : ${seconds} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);
