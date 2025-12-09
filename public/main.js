/* --- VARIABLES GLOBALES --- */
let carrito = [];
let usuarioLogueado = false;
let rolUsuario = 'cliente';

/* --- 1. INICIALIZACIÓN --- */
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});

/* --- 2. CONTROL DE MODALES --- */
function abrirRegistro() { document.getElementById('modal-registro').style.display = 'block'; }
function cerrarRegistro() { document.getElementById('modal-registro').style.display = 'none'; }

// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
    if (event.target == document.getElementById('modal-registro')) cerrarRegistro();
    if (event.target == document.getElementById('modal-ticket')) cerrarTicket();
}

/* --- 3. CARGA DE PRODUCTOS (LÓGICA DE BOTONES) --- */
function cargarProductos() {
    fetch('/api/productos')
        .then(res => res.json())
        .then(productos => {
            const contenedor = document.getElementById('lista-productos');
            contenedor.innerHTML = '';

            productos.forEach(prod => {
                let botonesAccion = '';

                // AQUÍ ESTÁ LA CLAVE: Decidimos qué botones mostrar según el rol
                if (rolUsuario === 'admin') {
                    // Botones para el JEFE
                    botonesAccion = `
                        <div style="display:flex; gap:5px; margin-top:10px;">
                            <button onclick="llenarFormularioEdicion('${prod.id}', '${prod.nombre}', '${prod.descripcion}', ${prod.precio}, '${prod.imagen_url}')" style="background:#f1c40f; color:#000; padding:5px; border:none; border-radius:5px; cursor:pointer; flex:1;">✏️ Editar</button>
                            <button onclick="eliminarProducto(${prod.id})" style="background:#c0392b; color:#fff; padding:5px; border:none; border-radius:5px; cursor:pointer; flex:1;">🗑️ Borrar</button>
                        </div>
                    `;
                } else {
                    // Botones para el CLIENTE
                    botonesAccion = `
                        <button onclick="agregarAlCarrito(${prod.id}, '${prod.nombre}', ${prod.precio})">
                            Agregar 🛒
                        </button>
                    `;
                }

                contenedor.innerHTML += `
                    <div class="card">
                        <img src="${prod.imagen_url}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/150'">
                        <h4>${prod.nombre}</h4>
                        <p>${prod.descripcion}</p>
                        <p class="price">$${prod.precio}</p>
                        ${botonesAccion}
                    </div>
                `;
            });
        })
        .catch(err => console.error("Error cargando productos:", err));
}

/* --- 4. SISTEMA DE USUARIOS --- */
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    })
        .then(res => { if (!res.ok) throw new Error("Error"); return res.json(); })
        .then(data => {
            usuarioLogueado = true;
            rolUsuario = data.rol;

            // Actualizar UI
            document.getElementById('user-panel').style.display = 'none';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('display-name').innerText = data.nombre;
            document.getElementById('display-saldo').innerText = data.saldo;

            if (rolUsuario === 'admin') {
                alert(`Bienvenido Jefe ${data.nombre}`);
                document.getElementById('carrito').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block'; // Mostrar Panel

                // RECARGA IMPORTANTE: Esto actualiza los botones de los panes
                cargarProductos();
            } else {
                document.getElementById('carrito').style.display = 'block';
                document.getElementById('admin-panel').style.display = 'none';
                cargarProductos();
            }
        })
        .catch(() => alert("Credenciales incorrectas"));
}

function logout() {
    fetch('/auth/logout', { method: 'POST' }).then(() => location.reload());
}

function registrarUsuario() {
    const u = document.getElementById('reg-user').value;
    const p = document.getElementById('reg-pass').value;
    const e = document.getElementById('reg-email').value;
    const n = document.getElementById('reg-nombre').value;

    fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p, email: e, nombre: n, telefono: 'N/A' })
    }).then(res => res.text()).then(msg => { alert(msg); cerrarRegistro(); });
}

/* --- 5. FUNCIONES DE ADMIN (Las que te faltaban) --- */

function guardarProducto() {
    const id = document.getElementById('prod-id').value;
    const datos = {
        nombre: document.getElementById('prod-nombre').value,
        descripcion: document.getElementById('prod-desc').value,
        precio: document.getElementById('prod-precio').value,
        imagen_url: document.getElementById('prod-img').value || 'https://via.placeholder.com/150'
    };

    if (!datos.nombre || !datos.precio) return alert("Nombre y Precio son obligatorios");

    let url = '/api/productos';
    let metodo = 'POST';

    // Si hay ID, editamos (PUT), si no, creamos (POST)
    if (id) {
        url += `/${id}`;
        metodo = 'PUT';
    }

    fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
        .then(res => res.json())
        .then(data => {
            alert(data.mensaje);
            limpiarFormularioAdmin();
            cargarProductos(); // Refrescar la lista para ver el cambio
        })
        .catch(err => alert("Error al guardar: " + err));
}

function eliminarProducto(id) {
    if (!confirm("¿Seguro que quieres borrar este pan del menú?")) return;

    fetch(`/api/productos/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            alert(data.mensaje);
            cargarProductos(); // Refrescar lista
        })
        .catch(err => alert("Error al eliminar"));
}

function llenarFormularioEdicion(id, nombre, desc, precio, img) {
    // Llena los campos de arriba con los datos del pan seleccionado
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-nombre').value = nombre;
    document.getElementById('prod-desc').value = desc;
    document.getElementById('prod-precio').value = precio;
    document.getElementById('prod-img').value = img;

    // Scroll suave hacia arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormularioAdmin() {
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-desc').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-img').value = '';
}

/* --- 6. CARRITO Y PAGOS (Clientes) --- */
function agregarFondos() {
    const input = document.getElementById('monto-fondos');
    const monto = parseFloat(input.value);
    if (monto > 0 && monto < 999999999999) {
        fetch('/api/fondos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto }) })
            .then(() => {
                alert("Fondos agregados");
                const saldoDisplay = document.getElementById('display-saldo');
                saldoDisplay.innerText = (parseFloat(saldoDisplay.innerText) + monto).toFixed(2);
                input.value = '';
            });
    } else {
        alert("Monto inválido");
    }
}

function agregarAlCarrito(id, nombre, precio) {
    const existe = carrito.find(p => p.id === id);
    if (existe) existe.cantidad++; else carrito.push({ id, nombre, precio, cantidad: 1 });
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const lista = document.getElementById('lista-carrito');
    lista.innerHTML = '';
    let total = 0;
    carrito.forEach((p, i) => {
        total += p.precio * p.cantidad;
        lista.innerHTML += `<li>${p.nombre} x${p.cantidad} <button onclick="carrito.splice(${i},1); actualizarVistaCarrito()" style="color:red; border:none; background:none; cursor:pointer;">❌</button></li>`;
    });
    document.getElementById('total-carrito').innerText = total.toFixed(2);
}

function procesarCompra() {
    const total = parseFloat(document.getElementById('total-carrito').innerText);
    if (carrito.length === 0) return alert("Carrito vacío");

    fetch('/api/comprar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carrito, total }) })
        .then(res => { if (!res.ok) throw new Error("Saldo insuficiente o error"); return res.json(); })
        .then(data => {
            mostrarTicket(data.num_venta, total);
            // Restar saldo visualmente
            const saldoDisplay = document.getElementById('display-saldo');
            saldoDisplay.innerText = (parseFloat(saldoDisplay.innerText) - total).toFixed(2);

            carrito = [];
            actualizarVistaCarrito();
            alert(data.mensaje);
        })
        .catch(e => alert(e.message));
}

function mostrarTicket(id, total) {
    document.getElementById('modal-ticket').style.display = 'block';
    document.getElementById('ticket-fecha').innerText = new Date().toLocaleString();
    document.getElementById('ticket-id').innerText = id;
    document.getElementById('ticket-total').innerText = total.toFixed(2);

    const lista = document.getElementById('ticket-productos');
    lista.innerHTML = '';
    carrito.forEach(p => lista.innerHTML += `<li>${p.nombre} x${p.cantidad} - $${(p.precio * p.cantidad).toFixed(2)}</li>`);
}

function cerrarTicket() {
    document.getElementById('modal-ticket').style.display = 'none';
    cargarProductos();
}