import Navigation from "@/components/Navigation";
import HowItWorks from "@/components/HowItWorks";
import Security from "@/components/Security";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Product = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-mirror-dark via-mirror-darker to-black">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-mirror-blue/10 border border-mirror-blue/30">
            <span className="text-mirror-blue text-sm font-medium">Platform Capabilities</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-mirror-blue to-white bg-clip-text text-transparent leading-tight">
            Turn Any Space Into A
            <br />
            Collaboration Hub
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Mirror Labs transforms spatial data into immersive 3D environments where distributed teams can measure,
            mark up, and make decisions together—eliminating costly miscommunication.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Security Section */}
      <Security />

      {/* CTA Section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Product;
