import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProjectListPage from './pages/ProjectListPage';
import ProjectPage from './pages/ProjectPage';
import BlogListPage from './pages/BlogListPage';
import BlogPage from './pages/BlogPage';
import { ThemeProvider } from './context/ThemeContext';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="projects" element={<ProjectListPage />} />
            <Route path="projects/:id" element={<ProjectPage />} />
            <Route path="blog" element={<BlogListPage />} />
            <Route path="blog/:id" element={<BlogPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
