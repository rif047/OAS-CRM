import TopHeader from "./Components/TopHeader.jsx";
import SideMenu from "./Components/SideMenu";
import Footer from "./Components/Footer";



function Layout({ children }) {
    return (
        <main className="flex min-h-screen w-full">
            <aside className="hidden shrink-0 md:sticky md:top-0 md:block md:h-screen">
                <SideMenu />
            </aside>

            <aside className="flex min-w-0 flex-1 flex-col">
                <header>
                    <TopHeader />
                </header>

                <section className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#eaf2ff_0%,#f4f7fc_42%,#eef2f7_100%)]">
                    <div className="mx-auto my-3 w-full max-w-[1820px] px-2 sm:my-4 sm:px-4 lg:my-5 lg:px-5 xl:px-6">
                        <main> {children} </main>
                    </div>
                </section>

                <footer>
                    <Footer />
                </footer>

            </aside>
        </main>
    );
}

export default Layout;
