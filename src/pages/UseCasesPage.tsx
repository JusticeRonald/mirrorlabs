import Navigation from "@/components/Navigation";
import UseCases from "@/components/UseCases";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const UseCasesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-mirror-dark via-mirror-darker to-black">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-mirror-blue/10 border border-mirror-blue/30">
            <span className="text-mirror-blue text-sm font-medium">Industries We Serve</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-mirror-blue to-white bg-clip-text text-transparent leading-tight">
            Built For Teams Who
            <br />
            Can't Afford Miscommunication
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Whether you're coordinating complex projects, managing assets, or planning operations,
            Mirror Labs gives your team a shared reality to work from.
          </p>
        </div>
      </section>

      {/* Use Cases Section */}
      <UseCases />

      {/* CTA Section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default UseCasesPage;
