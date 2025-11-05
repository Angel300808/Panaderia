// public/app.js

document.addEventListener("DOMContentLoaded", () => {
  
  // --- Selectores de Autenticación ---
  const regUsername = document.getElementById("reg-username");
  const regPassword = document.getElementById("reg-password");
  const btnRegister = document.getElementById("btn-register");
  
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const btnLogin = document.getElementById("btn-login");
  
  const authMsg = document.getElementById("auth-msg");
  
  // --- Selectores de Navegación (NUEVOS) ---
  const navAuth = document.getElementById("nav-auth");
  const navAdminLink = document.getElementById("nav-admin-link");

  // --- Selectores de Secciones ---
  const authSection = document.getElementById("auth-section");
  const authHr = document.getElementById("auth-hr"); // El <hr>
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

  
  // =============================================
  // FUNCIONES DE AUTENTICACIÓN
  // =============================================

  const registrarUsuario = async () => {
    // ... (Esta función no cambia)
    const username = regUsername.value;
    const password = regPassword.value;
    authMsg.textContent = "";
    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        authMsg.textContent = "✅ " + data.message + " Ahora puedes iniciar sesión.";
        authMsg.style.color = "green";
        regUsername.value = "";
        regPassword.value = "";
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
        actualizarUI(true, data.username, data.role);
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
      actualizarUI(data.loggedIn, data.username, data.role);
    } catch (err) {
      console.error("Error chequeando sesión", err);
      actualizarUI(false);
    }
  };

  // =============================================
  // FUNCIONES DE CLIENTE (PRODUCTOS, CARRITO, PEDIDO)
  // =============================================

  const cargarProductos = async () => {
    // --- FUNCIÓN MEJORADA CON IMÁGENES ---
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
        // Usamos una imagen genérica si imagen_url está vacía
        const imgUrl = p.imagen_url || 'https://via.placeholder.com/300x180.png?text=Pan';
        
        div.innerHTML = `
          <img src="${imgUrl}" alt="${p.nombre}">
          <div class="info">
            <strong>${p.nombre}</strong><br>
            <span>$${parseFloat(p.precio).toFixed(2)}</span><br>
            <small>${p.descripcion || 'Sin descripción.'}</small>
          </div>
          <button class="btn-agregar-carrito" data-id="${p.id}">Añadir al carrito</button>
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
      if (!res.ok) throw new Error("No se pudo agregar al carrito.");
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
  
  // ... (Todas las funciones del CRUD: cargarProductosAdmin, validarFormulario,
  //      guardarProducto, abrirModal, manejarClicsAdmin...
  //      NO CAMBIAN. Las pego aquí para que reemplaces todo el archivo)

  const cargarProductosAdmin = async () => {
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
    if (!validarFormulario()) return;
    const datosProducto = {
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
        cargarProductos(); 
    } catch (error) {
        formError.textContent = error.message;
        formError.style.display = 'block';
    }
  };

  const abrirModal = (producto = null) => {
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
  // LÓGICA DE UI (¡MODIFICADA!)
  // =============================================

  function actualizarUI(estaLogueado, username = "", role = "cliente") {
    
    pedidoMsg.textContent = ""; // Limpiar mensaje de pedido
    
    if (estaLogueado) {
      // --- NAVEGACIÓN ---
      navAuth.innerHTML = `
        <span id="nav-welcome">¡Hola, ${username}!</span>
        <button id="nav-btn-logout">Cerrar sesión</button>
      `;
      // Reconectar el botón de logout de la NAV
      document.getElementById("nav-btn-logout").addEventListener("click", cerrarSesion);

      // --- SECCIONES PRINCIPALES ---
      authSection.style.display = 'none'; // Ocultar formulario de login/registro
      productosSection.style.display = 'block';
      carritoSection.style.display = 'block';
      
      // --- LÓGICA DE ROLES ---
      if (role === 'admin') {
        adminSection.style.display = 'block'; // Mostrar CRUD
        navAdminLink.style.display = 'block'; // Mostrar link de Admin
        cargarProductosAdmin(); 
      } else {
        adminSection.style.display = 'none'; // Ocultar CRUD
        navAdminLink.style.display = 'none'; // Ocultar link de Admin
      }
      
      // Cargar datos de cliente
      cargarProductos();
      cargarCarrito();
      
    } else {
      // --- NAVEGACIÓN ---
      navAuth.innerHTML = `
        <a href="#auth-section" class="btn-primary" id="nav-btn-login">Iniciar Sesión</a>
      `;
      
      // --- SECCIONES PRINCIPALES ---
      authSection.style.display = 'block'; // Mostrar login/registro
      
      // Mostrar formularios de login/registro
      authSection.querySelector('#register').style.display = 'block';
      authSection.querySelector('#login').style.display = 'block';
      authSection.querySelectorAll('hr').forEach(hr => hr.style.display = 'block');
      authMsg.style.display = 'block';
      welcomeSection.style.display = 'none';
      
      // Ocultar contenido
      productosSection.style.display = 'none';
      carritoSection.style.display = 'none';
      adminSection.style.display = 'none'; 
      navAdminLink.style.display = 'none';
      
      // Limpiar
      authMsg.textContent = "Por favor, inicia sesión o regístrate.";
      authMsg.style.color = "#333";
      loginUsername.value = "";
      loginPassword.value = "";
      regUsername.value = "";
      regPassword.value = "";
    }
  }

  // =============================================
  // EVENT LISTENERS (ASIGNACIÓN DE BOTONES)
  // =============================================
  
  // --- Autenticación ---
  btnRegister.addEventListener("click", registrarUsuario);
  btnLogin.addEventListener("click", iniciarSesion);
  // El logout se conecta en actualizarUI porque el botón se crea dinámicamente

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
  checkSession(); // Revisa si ya hay una sesión activa al cargar la página
  
});
