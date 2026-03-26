import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

interface DesignSection {
  title: string;
  content?: string;
  subsections?: { title: string; content?: string; list?: string[] }[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  list?: string[];
}

interface DesignDocument {
  title: string;
  author: string;
  date: string;
  course: string;
  sections: DesignSection[];
}

interface DesignDocProps {
  url: string;
}

const DesignDoc: React.FC<DesignDocProps> = ({ url }) => {
  const [doc, setDoc] = useState<DesignDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load design document');
        const data = await response.json();
        setDoc(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-xl border border-white/10">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Fetching System Blueprint...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-500/5 rounded-xl border border-red-500/20">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-red-400 font-mono text-sm tracking-widest uppercase">{error || 'Document not found'}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-[#fdfcf8] text-[#1a1a1a] rounded-sm overflow-hidden font-serif"
      style={{
        boxShadow: `
          0 1px 1px rgba(0,0,0,0.11), 
          0 2px 2px rgba(0,0,0,0.11), 
          0 4px 4px rgba(0,0,0,0.11), 
          0 8px 8px rgba(0,0,0,0.11), 
          0 16px 16px rgba(0,0,0,0.11),
          0 0 0 1px rgba(0,0,0,0.05)
        `
      }}
    >
      {/* Paper Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
      
      {/* Header Section */}
      <div className="p-12 md:p-20 border-b border-[#e5e5e0] text-center relative bg-[#f9f8f4]">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/40" />
        <div className="mb-4 text-[10px] uppercase tracking-[0.4em] font-sans font-black text-primary/60">
          Technical Specification
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-[#1a1a1a] leading-tight">
          {doc.title}
        </h1>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-[#7a7a74]">
          <div className="flex items-center gap-2">
            <span className="text-primary/40">BY</span>
            <span>{doc.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary/40">DATE</span>
            <span>{doc.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary/40">REF</span>
            <span>{doc.course}</span>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-12 md:p-24 space-y-24 relative mx-auto">
        {doc.sections.map((section, sIdx) => (
          <section key={sIdx} className="relative">
            <div className="flex items-baseline gap-6 mb-10">
              <span className="text-4xl font-sans font-black text-primary/10 select-none">
                0{sIdx + 1}
              </span>
              <h2 className="text-sm uppercase tracking-[0.4em] font-sans font-black text-[#1a1a1a]">
                {section.title}
              </h2>
            </div>

            {section.content && (
              <div className="prose prose-stone prose-lg max-w-none mb-10 text-[#2a2a24] leading-[1.8] font-serif">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            )}

            {section.list && (
              <ul className="space-y-6 mb-12 list-none pl-0">
                {section.list.map((item, i) => (
                  <li key={i} className="flex items-start gap-6 text-xl leading-relaxed text-[#3a3a34]">
                    <span className="text-primary/40 mt-2 font-sans font-black text-xs">0{i + 1}</span>
                    <ReactMarkdown>{item}</ReactMarkdown>
                  </li>
                ))}
              </ul>
            )}

            {section.subsections && (
              <div className="space-y-16">
                {section.subsections.map((sub, subIdx) => (
                  <div key={subIdx} className="relative pl-10 border-l border-primary/10">
                    <h3 className="text-2xl font-bold mb-6 italic text-[#2a2a24] tracking-tight">
                      {sub.title}
                    </h3>
                    {sub.content && (
                      <div className="prose prose-stone prose-lg max-w-none mb-6 text-[#3a3a34] leading-[1.8]">
                        <ReactMarkdown>{sub.content}</ReactMarkdown>
                      </div>
                    )}
                    {sub.list && (
                      <ul className="space-y-4 list-none pl-0">
                        {sub.list.map((item, i) => (
                          <li key={i} className="flex items-start gap-4 text-lg leading-relaxed text-[#4a4a44]">
                            <span className="text-primary/30 mt-2 text-[8px]">■</span>
                            <ReactMarkdown>{item}</ReactMarkdown>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {section.table && (
              <div className="my-16 overflow-x-auto rounded-xl border border-[#e5e5e0] shadow-sm bg-white">
                <table className="w-full border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-[#f9f8f4] border-b border-[#e5e5e0]">
                      {section.table.headers.map((h, i) => (
                        <th key={i} className="p-6 text-left font-black uppercase tracking-[0.2em] text-[#5a5a54] border-r border-[#e5e5e0] last:border-r-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-[#f0f0eb] last:border-0 hover:bg-[#fdfcf8] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-6 align-top leading-relaxed text-[#4a4a44] border-r border-[#f0f0eb] last:border-r-0">
                            <div className="prose prose-stone prose-sm max-w-none">
                              <ReactMarkdown>{cell}</ReactMarkdown>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="p-12 bg-[#f5f5f0] border-t border-[#e5e5e0] flex justify-between items-center font-sans text-[10px] uppercase tracking-widest font-bold text-[#8a8a84]">
        <span>System Design Specification</span>
        <span>© 2026 Distributed Systems Lab</span>
      </div>
    </motion.div>
  );
};

export default DesignDoc;
