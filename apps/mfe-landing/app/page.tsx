        {/* Ejemplo de componente remoto federado */}
        {/* Client Component para federación */}
        <div className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Micro Frontend Integrado</h3>
          <div className="w-full">
            {/* El componente federado se consume aquí */}
            {typeof window !== "undefined" && <>{require("./components/RemoteExampleClient").default()}</>}
          </div>
        </div>

  {/* Sección Blog/Noticias */}
        <section id="blog" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Blog & Noticias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="bg-blue-50 p-4 rounded-lg shadow">
              <h4 className="font-bold text-blue-700 mb-1">Lanzamos nuestro nuevo sistema de IA para obras</h4>
              <p className="text-gray-700 text-sm mb-2">Descubre cómo nuestra inteligencia artificial está optimizando la gestión y ejecución de proyectos en tiempo real.</p>
              <span className="text-xs text-gray-500">20 Sep 2025</span>
            </article>
            <article className="bg-blue-50 p-4 rounded-lg shadow">
              <h4 className="font-bold text-blue-700 mb-1">Neurobuildtech en el Congreso de Innovación</h4>
              <p className="text-gray-700 text-sm mb-2">Participamos como ponentes en el evento más importante de tecnología para la construcción en Latinoamérica.</p>
              <span className="text-xs text-gray-500">10 Sep 2025</span>
            </article>
          </div>
        </section>
        {/* Sección Contacto */}
        <section id="contacto" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form className="bg-blue-50 p-4 rounded-lg shadow flex flex-col gap-4">
              <input type="text" placeholder="Nombre" className="p-2 rounded border border-blue-200" />
              <input type="email" placeholder="Correo electrónico" className="p-2 rounded border border-blue-200" />
              <textarea placeholder="Mensaje" className="p-2 rounded border border-blue-200" rows={4}></textarea>
              <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">Enviar</button>
            </form>
            <div className="flex flex-col justify-center bg-blue-50 p-4 rounded-lg shadow">
              <p className="text-gray-700 mb-2"><span className="font-bold">Email:</span> contacto@neurobuildtech.com</p>
              <p className="text-gray-700 mb-2"><span className="font-bold">Teléfono:</span> +54 11 1234-5678</p>
              <p className="text-gray-700"><span className="font-bold">Dirección:</span> Av. Innovación 123, Buenos Aires, Argentina</p>
            </div>
          </div>
        </section>
        {/* Sección Testimonios */}
        <section id="testimonios" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Testimonios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow flex flex-col">
              <p className="text-gray-700 italic mb-2">“Neurobuildtech revolucionó la gestión de nuestro proyecto. La automatización nos ahorró tiempo y dinero.”</p>
              <span className="font-bold text-blue-700">María López</span>
              <span className="text-gray-600 text-sm">Directora de Proyectos, Constructora XYZ</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow flex flex-col">
              <p className="text-gray-700 italic mb-2">“La integración de IA nos permitió anticipar problemas y mejorar la calidad de nuestras obras.”</p>
              <span className="font-bold text-blue-700">Roberto Fernández</span>
              <span className="text-gray-600 text-sm">Gerente de Innovación, Obras Modernas</span>
            </div>
          </div>
        </section>
        {/* Sección Equipo */}
        <section id="equipo" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Equipo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center bg-blue-50 p-4 rounded-lg shadow">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="CEO" className="w-20 h-20 rounded-full mb-2" />
              <span className="font-bold text-blue-700">Juan Pérez</span>
              <span className="text-gray-600 text-sm">CEO & Fundador</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 p-4 rounded-lg shadow">
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="CTO" className="w-20 h-20 rounded-full mb-2" />
              <span className="font-bold text-blue-700">Ana Gómez</span>
              <span className="text-gray-600 text-sm">CTO</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 p-4 rounded-lg shadow">
              <img src="https://randomuser.me/api/portraits/men/65.jpg" alt="COO" className="w-20 h-20 rounded-full mb-2" />
              <span className="font-bold text-blue-700">Carlos Ruiz</span>
              <span className="text-gray-600 text-sm">COO</span>
            </div>
          </div>
        </section>
        {/* Sección Servicios */}
        <section id="servicios" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Servicios</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="bg-blue-50 p-4 rounded-lg shadow">
              <span className="font-bold text-blue-700">Automatización de procesos</span>
              <p className="text-gray-700 text-sm">Implementamos sistemas inteligentes para optimizar la gestión y ejecución de obras.</p>
            </li>
            <li className="bg-blue-50 p-4 rounded-lg shadow">
              <span className="font-bold text-blue-700">Gestión avanzada de proyectos</span>
              <p className="text-gray-700 text-sm">Soluciones digitales para el seguimiento, control y análisis de proyectos de construcción.</p>
            </li>
            <li className="bg-blue-50 p-4 rounded-lg shadow">
              <span className="font-bold text-blue-700">Inteligencia artificial aplicada</span>
              <p className="text-gray-700 text-sm">Modelos predictivos y analítica avanzada para la toma de decisiones estratégicas.</p>
            </li>
            <li className="bg-blue-50 p-4 rounded-lg shadow">
              <span className="font-bold text-blue-700">Integración de micro frontends</span>
              <p className="text-gray-700 text-sm">Arquitectura modular para escalar y personalizar soluciones tecnológicas.</p>
            </li>
          </ul>
  </section>

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <main className="flex flex-col items-center gap-8 p-8 w-full max-w-2xl bg-white/80 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Neurobuildtech</h1>
        <h2 className="text-xl text-blue-700 mb-4">Innovación en construcción y tecnología</h2>
        <p className="text-center text-gray-700 mb-6">
          Somos líderes en soluciones tecnológicas para la industria de la construcción, integrando inteligencia artificial, automatización y gestión avanzada de proyectos.
        </p>

        {/* Sección Sobre Nosotros */}
        <section id="sobre-nosotros" className="w-full mb-8">
          <h3 className="text-2xl font-semibold text-blue-800 mb-2">Sobre Nosotros</h3>
          <p className="text-gray-700">
            Neurobuildtech nació con la misión de transformar la industria de la construcción a través de la tecnología. Nuestro equipo multidisciplinario combina experiencia en ingeniería, software y gestión para ofrecer soluciones innovadoras y sostenibles.
          </p>
        </section>

        <a
          href="#contacto"
          className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition"
        >
          Contáctanos
        </a>
      </main>
      <footer className="mt-8 text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Neurobuildtech. Todos los derechos reservados.
      </footer>
    </div>
  );
}
