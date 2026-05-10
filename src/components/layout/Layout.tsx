import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import BottomTabBar from "./BottomTabBar";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Bottom padding on mobile to clear BottomTabBar (~64px) */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {!hideFooter && <Footer />}
      <BottomTabBar />
    </div>
  );
};

export default Layout;
