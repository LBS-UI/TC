self.addEventListener("push", (event) => {
  let data = { title: "Tambayan Cawag", body: "New order received.", url: "/admin.html#orders" };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    data.body = event.data ? event.data.text() : data.body;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Tambayan Cawag", {
      body: data.body || "New order received.",
      icon: "/assets/logo.png",
      badge: "/assets/logo.png",
      data: { url: data.url || "/admin.html#orders" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin.html#orders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/admin.html") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
