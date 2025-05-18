import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sampleRepositories } from '../services/apiService';

const RepoSuggestions = ({ onSelectRepo }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <motion.button
        onClick={toggleOpen}
        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Need ideas? View sample repositories
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 mt-2 w-96 max-h-96 overflow-y-auto bg-card rounded-md shadow-lg border border-border"
          >
            <div className="p-2">
              <h3 className="font-medium text-sm mb-2 px-2">Sample Repositories</h3>
              <div className="space-y-1">
                {sampleRepositories.map((repo, index) => (
                  <motion.div
                    key={index}
                    className="p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => {
                      onSelectRepo(repo);
                      setIsOpen(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(var(--muted), 0.8)' }}
                  >
                    <p className="font-medium text-sm">{repo.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{repo.url}</p>
                    <p className="text-xs text-muted-foreground">File: {repo.filePath}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RepoSuggestions;
