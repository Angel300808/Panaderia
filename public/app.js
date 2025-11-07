document.addEventListener("DOMContentLoaded", () => {
 
  // --- Selectores de Autenticación ---
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const regUsername = document.getElementById("reg-username");
  const regPassword = document.getElementById("reg-password");
  const regNombre = document.getElementById("reg-nombre");
  const regEmail = document.getElementById("reg-email");
  const regTelefono = document.getElementById("reg-telefono");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const authMsg = document.getElementById("auth-msg");
  
  // --- Selectores de Navegación ---
  const navAuth = document.getElementById("nav-auth");
  const navAdminLink = document.getElementById("nav-admin-link");
  const navProductosLink = document.querySelector("a[href='#productos-section']");
  const navCarritoLink = document.querySelector("a[href='#carrito-section']");

  // --- Selectores de Secciones ---
  const authSection = document.getElementById("auth-section");
  const authHr = document.getElementById("auth-hr");
  const welcomeSection = document.getElementById("welcome-section");
  const welcomeMsg = document.getElementById("welcome-msg");
  const productosSection = document.getElementById("productos-section");
  const carritoSection = document.getElementById("carrito-section");
  const adminSection = document.getElementById("admin-section"); 

  // --- Contenedores de Cliente ---
  const productosCont = document.getElementById("productos");
  const carritoUl = document.getElementById("carrito");
  const btnRealizarPedido = document.getElementById("btnRealizarPedido");
  const pedidoMsg = document.getElementById("pedido-msg");

  // --- Selectores de Admin (CRUD) ---
  const tablaProductosAdmin = document.getElementById("tabla-productos-admin");
  const productoModal = document.getElementById("productoModal");
  const modalCloseBtn = document.querySelector(".modal-close-btn");
  const btnNuevoProducto = document.getElementById("btnNuevoProducto");
  const btnGuardar = document.getElementById("btnGuardar");
  const productoForm = document.getElementById("productoForm");
  const formError = document.getElementById("formError");
  const modalTitle = document.getElementById("productoModalLabel");
  
  let idProductoEditar = null; 

  // --- ¡NUEVO! Variable para guardar el rol actual ---
  let currentUserRole = 'cliente';

// =============================================
// FUNCIONES DE AUTENTICACIÓN
// =============================================

const registrarUsuario = async () => {
    // ... (Esta función no cambia)
    const nombre = regNombre.value;
    const email = regEmail.value;
    const telefono = regTelefono.value;
    const username = regUsername.value;
    const password = regPassword.value;
    authMsg.textContent = "";
    if (!nombre || !email || !username || !password) {
        authMsg.textContent = "❌ Error: Campos obligatorios faltantes.";
        authMsg.style.color = "#d9534f";
        return;
    }
    try {
        const res = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, nombre, email, telefono }),
        });
        const data = await res.json();
        if (res.ok) {
            authMsg.textContent = "✅ " + data.message + " Ahora puedes iniciar sesión.";
            authMsg.style.color = "green";
            registerForm.reset(); 
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        authMsg.textContent = "❌ Error: " + err.message;
        authMsg.style.color = "#d9534f";
    }
};

const iniciarSesion = async () => {
    // ... (Esta función no cambia)
    const username = loginUsername.value;
    const password = loginPassword.value;
    authMsg.textContent = "";
    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) {
            actualizarUI(true, data.username, data.role, data.nombre);
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        authMsg.textContent = "❌ Error: " + err.message;
        authMsg.style.color = "#d9534f";
    }
};

  const cerrarSesion = async () => {
    // ... (Esta función no cambia)
    try {
      await fetch("/logout", { method: "POST" });
      actualizarUI(false); 
    } catch (err) {
      alert("❌ Error al cerrar sesión.");
    }
  };

  const checkSession = async () => {
    // ... (Esta función no cambia)
    try {
      const res = await fetch("/session");
      const data = await res.json();
      actualizarUI(data.loggedIn, data.username, data.role, data.nombre);
    } catch (err) {
      console.error("Error chequeando sesión", err);
      actualizarUI(false);
    }
  };

// =============================================
// FUNCIONES DE CLIENTE (PRODUCTOS, CARRITO, PEDIDO)
// =============================================

  // --- ¡MODIFICADA! ---
  // Ahora oculta el botón "Añadir al carrito" si es admin
  const cargarProductos = async () => {
    try {
      const res = await fetch("/api/productos");
      if (!res.ok) {
        const errorData = await res.json(); 
        throw new Error(errorData.error); 
      }
      const productos = await res.json();
      
      productosCont.innerHTML = "";
      
      if (productos.length === 0) {
        productosCont.innerHTML = "<p>No hay productos en el inventario.</p>";
        return;
      }
      
      productos.forEach(p => {
        const div = document.createElement("div");
        const imgUrl = p.imagen_url || 'https://via.placeholder.com/300x180.png?text=Pan';
        
        // --- Lógica de Botón Condicional ---
        // Si el rol es 'cliente', muestra el botón. Si es 'admin', muestra un string vacío.
        const botonHtml = (currentUserRole === 'cliente')
            ? `<button class="btn-agregar-carrito" data-id="${p.id}">Añadir al carrito</button>`
            : ''; // El admin no ve el botón

        div.innerHTML = `
          <img src="${imgUrl}" alt="${p.nombre}">
          <div class="info">
            <strong>${p.nombre}</strong><br>
            <span>$${parseFloat(p.precio).toFixed(2)}</span><br>
            <small>${p.descripcion || 'Sin descripción.'}</small>
          </div>
          ${botonHtml} 
        `;
        productosCont.appendChild(div);
      });

    } catch(err) {
      productosCont.innerHTML = `<p style="color:red; font-weight:bold;">${err.message}</p>`;
    }
  };

  const cargarCarrito = async () => {
    // ... (Esta función no cambia)
    try {
      const res = await fetch("/api/carrito");
      if (!res.ok) throw new Error("No se pudo cargar el carrito.");
      const data = await res.json();
      carritoUl.innerHTML = ""; 
      if (!data.carrito || data.carrito.length === 0) {
        carritoUl.innerHTML = "<li>El carrito está vacío.</li>";
        return;
      }
      let total = 0; 
      for (const item of data.carrito) {
        const precio = parseFloat(item.precio);
        const cantidad = parseInt(item.cantidad, 10);
        const subtotal = precio * cantidad;
        const li = document.createElement("li");
        li.textContent = `${item.nombre} (x${cantidad}) - $${subtotal.toFixed(2)}`;
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = () => eliminarDelCarrito(item.id_producto);
        li.appendChild(btn);
        carritoUl.appendChild(li);
        total += subtotal; 
      }
      const totalLi = document.createElement("li");
      totalLi.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
      totalLi.style.marginTop = '10px';
      totalLi.style.borderTop = '2px solid #333';
      totalLi.style.justifyContent = 'flex-end';
      carritoUl.appendChild(totalLi);
    } catch(err) {
      carritoUl.innerHTML = `<li>Error al cargar el carrito: ${err.message}</li>`;
    }
  };

  const agregarCarrito = async (id_producto) => {
    // ... (Esta función no cambia)
    try {
      const res = await fetch("/api/carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_producto: id_producto, cantidad: 1 })
      });
      if (!res.ok) {
        // El admin recibirá un error 403 del backend,
        // pero esta función no debería llamarse (el botón no existe)
        const errData = await res.json();
        throw new Error(errData.error || "No se pudo agregar al carrito.");
      }
      cargarCarrito(); 
    } catch(err) {
      alert(err.message);
    }
  };

  const eliminarDelCarrito = async (id_producto) => {
    // ... (Esta función no cambia)
    try {
      const res = await fetch(`/api/carrito/${id_producto}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar del carrito.");
      cargarCarrito(); 
    } catch(err) {
      alert(err.message);
    }
  };

  const realizarPedido = async () => {
    // ... (Esta función no cambia)
    pedidoMsg.textContent = "";
    if (!confirm("¿Estás seguro de que quieres realizar este pedido?")) return;
    try {
      const res = await fetch("/api/pedidos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo procesar el pedido.");
      pedidoMsg.textContent = `✅ ¡Pedido #${data.id_pedido} realizado con éxito!`;
      cargarCarrito(); 
    } catch (err) {
      pedidoMsg.textContent = `❌ Error: ${err.message}`;
    }
  };
  
// =============================================
// FUNCIONES DEL ADMIN (CRUD)
// =============================================
  
  const cargarProductosAdmin = async () => {
    // ... (Esta función no cambia)
     try {
      const res = await fetch("/api/productos");
      if (!res.ok) throw new Error("No se pudieron cargar productos.");
      const productos = await res.json();
      tablaProductosAdmin.innerHTML = ""; 
      productos.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.nombre}</td>
          <td>$${parseFloat(p.precio).toFixed(2)}</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn-warning btn-editar" data-id="${p.id}">Editar</button>
            <button class="btn-danger btn-eliminar" data-id="${p.id}">Borrar</button>
          </td>
        `;
        tablaProductosAdmin.appendChild(tr);
      });
    } catch(err) {
      tablaProductosAdmin.innerHTML = `<tr><td colspan="5" style="color:red;">${err.message}</td></tr>`;
    }
  };

  const validarFormulario = () => {
    // ... (Esta función no cambia)
     const nombre = document.getElementById('nombre').value;
     const precio = document.getElementById('precio').value;
     const stock = document.getElementById('stock').value;
     formError.style.display = 'none';
     if (!nombre.trim() || !precio || !stock) {
         formError.textContent = 'Error: Nombre, Precio y Stock son obligatorios.';
         formError.style.display = 'block';
         return false;
     }
     if (parseFloat(precio) <= 0) {
         formError.textContent = 'Error: El precio debe ser mayor a 0.';
         formError.style.display = 'block';
         return false;
     }
     return true;
  };

  const guardarProducto = async () => {
    // --- ¡MODIFICADA! ---
    if (!validarFormulario()) return;
    const datosProducto = {
        // ... (igual)
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        id_categoria: parseInt(document.getElementById('id_categoria').value),
        imagen_url: document.getElementById('imagen_url').value
    };
    let url = '/api/productos';
    let method = 'POST';
    if (idProductoEditar) {
        url = `/api/productos/${idProductoEditar}`;
        method = 'PUT';
    }
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosProducto)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al guardar'); 
        }
        productoModal.style.display = 'none'; 
        cargarProductosAdmin(); 
        // --- ¡AÑADIDO! ---
        // Recargamos la vista de cliente para que el admin vea el cambio
        cargarProductos(); 
    } catch (error) {
        formError.textContent = error.message;
        formError.style.display = 'block';
    }
  };

  const abrirModal = (producto = null) => {
    // ... (Esta función no cambia)
    formError.style.display = 'none';
    if (producto) {
      idProductoEditar = producto.id;
      modalTitle.textContent = 'Editar Producto';
      document.getElementById('nombre').value = producto.nombre;
      document.getElementById('descripcion').value = producto.descripcion;
      document.getElementById('precio').value = producto.precio;
      document.getElementById('stock').value = producto.stock;
      document.getElementById('id_categoria').value = producto.id_categoria;
      document.getElementById('imagen_url').value = producto.imagen_url;
    } else {
      idProductoEditar = null;
      modalTitle.textContent = 'Agregar Producto';
      productoForm.reset();
    }
    productoModal.style.display = 'flex';
  };
  
  const manejarClicsAdmin = async (e) => {
      // --- ¡MODIFICADA! ---
      if (e.target.classList.contains('btn-eliminar')) {
          const id = e.target.dataset.id;
          if (confirm(`¿Seguro que quieres eliminar el producto ID ${id}?`)) {
              try {
                  const response = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
                  if (!response.ok) {
                      const err = await response.json();
                      throw new Error(err.error || 'Error al eliminar');
                  }
                  cargarProductosAdmin(); 
                  // --- ¡AÑADIDO! ---
                  // Recargamos la vista de cliente para que el admin vea el cambio
                  cargarProductos();
              } catch (error) {
                  alert(error.message);
              }
          }
      }
      if (e.target.classList.contains('btn-editar')) {
          const id = e.target.dataset.id;
          try {
             const res = await fetch("/api/productos");
             const productos = await res.json();
             const producto = productos.find(p => p.id == id);
             if (producto) {
                abrirModal(producto);
             }
          } catch(err) {
            alert("Error al cargar datos para editar.");
          }
      }
  };

// =============================================
// LÓGICA DE UI (¡MODIFICADA PARA ROLES!)
// =============================================

function actualizarUI(estaLogueado, username = "", role = "cliente", nombre = "") {
    
    const heroBtn = document.querySelector('.hero .btn-primary');
    pedidoMsg.textContent = ""; 
    
    // --- ¡AÑADIDO! Actualizamos la variable de rol global ---
    currentUserRole = role;

    if (estaLogueado) {
        // --- LÓGICA DE LOGIN ---
        if (heroBtn) heroBtn.href = "#productos-section"; 
        
        const saludo = nombre || username; 
        
        navAuth.innerHTML = `
            <span id="nav-welcome">¡Hola, ${saludo}!</span>
            <button id="nav-btn-logout">Cerrar sesión</button>
        `;

        document.getElementById("nav-btn-logout").addEventListener("click", cerrarSesion);
        authSection.style.display = 'none'; 
        
        // --- ¡MODIFICADO! LÓGICA DE ROLES ---
        if (role === 'admin') {
            // --- VISTA DE ADMIN ---
            adminSection.style.display = 'block';
            productosSection.style.display = 'block'; // <-- CAMBIO: Mostrar
            carritoSection.style.display = 'none';   // <-- Mantener Oculto
            
            if (navAdminLink) navAdminLink.style.display = 'block';
            if (navProductosLink) navProductosLink.style.display = 'block'; // <-- CAMBIO: Mostrar
            if (navCarritoLink) navCarritoLink.style.display = 'none';   // <-- Mantener Oculto

            if (heroBtn) heroBtn.href = "#admin-section";

            // Cargar AMBAS listas
            cargarProductosAdmin(); 
            cargarProductos(); // <-- AÑADIDO

        } else {
            // --- VISTA DE CLIENTE ---
            adminSection.style.display = 'none';
            productosSection.style.display = 'block';
            carritoSection.style.display = 'block';
            
            if (navAdminLink) navAdminLink.style.display = 'none';
            if (navProductosLink) navProductosLink.style.display = 'block';
            if (navCarritoLink) navCarritoLink.style.display = 'block';

            if (heroBtn) heroBtn.href = "#productos-section";
            
            // Cargar solo listas de cliente
            cargarProductos();
            cargarCarrito();
        }
        
    } else {
        // --- VISTA DESLOGUEADO ---
        
        // --- ¡AÑADIDO! Reseteamos el rol global ---
        currentUserRole = 'cliente'; 

        if (heroBtn) heroBtn.href = "#auth-section";

        navAuth.innerHTML = `
            <a href="#auth-section" class="btn-primary" id="nav-btn-login">Iniciar Sesión</a>
        `;
        
        authSection.style.display = 'block'; 
        productosSection.style.display = 'none';
        carritoSection.style.display = 'none';
        adminSection.style.display = 'none'; 
        
        if (navAdminLink) navAdminLink.style.display = 'none';
        if (navProductosLink) navProductosLink.style.display = 'block'; // Mostrar por defecto
        if (navCarritoLink) navCarritoLink.style.display = 'block';   // Mostrar por defecto
        
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    }
}

// =============================================
// EVENT LISTENERS (ASIGNACIÓN DE BOTONES)
// =============================================
  
  // --- Autenticación ---
  registerForm.addEventListener("submit", (e) => {
      e.preventDefault(); 
      registrarUsuario(); 
  });

  loginForm.addEventListener("submit", (e) => {
      e.preventDefault(); 
      iniciarSesion();    
  });


  // --- Cliente ---
  productosCont.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-agregar-carrito")) {
      const id = e.target.dataset.id;
      agregarCarrito(id);
    }
  });
  btnRealizarPedido.addEventListener("click", realizarPedido);
  
  // --- Admin (CRUD) ---
  btnNuevoProducto.addEventListener('click', () => abrirModal(null));
  modalCloseBtn.addEventListener('click', () => productoModal.style.display = 'none');
  btnGuardar.addEventListener('click', guardarProducto);
  tablaProductosAdmin.addEventListener('click', manejarClicsAdmin);

  // --- INICIO DE LA APP ---
  checkSession(); 
  
});