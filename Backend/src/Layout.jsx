import TopHeader from "./Components/TopHeader.jsx";
import SideMenu from "./Components/SideMenu";
import Footer from "./Components/Footer";



function Layout({ children }) {
    return (
        <main className="flex min-h-screen w-full">
            <aside className="hidden shrink-0 bg-[#ffffff] md:block">
                <SideMenu />
            </aside>

            <aside className="flex min-w-0 flex-1 flex-col">
                <header>
                    <TopHeader />
                </header>

                <section className="min-h-0 flex-1 overflow-auto bg-[#f2f2f2]">
                    <div className="mx-auto my-3 w-full max-w-[1700px] px-2 sm:my-4 sm:px-4 lg:px-5 xl:px-6">
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
