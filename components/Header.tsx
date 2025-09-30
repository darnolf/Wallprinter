/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Logo = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-800 dark:text-zinc-200">
        <path d="M4 4H44V14H34V44H4V4Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 14V24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 14V24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 34H24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const Header: React.FC = () => {
  return (
    <header className="w-full p-4 flex items-center justify-between">
      <div className="flex items-center justify-center gap-4">
          <Logo />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100">
            Wallprinter
          </h1>
      </div>
    </header>
  );
};

export default Header;