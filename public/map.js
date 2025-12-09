document.addEventListener('DOMContentLoaded', () => {
    // Inicializar mapa
    const mymap = L.map('mapid').setView([19.4326, -99.1332], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);

    // Cargar sucursales desde la API
    fetch('/api/sucursales')
        .then(res => res.json())
        .then(data => {
            data.forEach(sucursal => {
                L.marker([sucursal.lat, sucursal.lng]).addTo(mymap)
                    .bindPopup(`<b>${sucursal.nombre}</b><br>¡Ven por tu pan caliente!`);
            });
        });
});