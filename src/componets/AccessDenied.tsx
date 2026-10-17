import React from 'react';

interface Props {
  message: string;
}

const AccessDenied: React.FC<Props> = ({ message }) => {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-lg md:p-16">
      <p className="mb-4 text-5xl md:text-6xl">🔒</p>

      <p className="text-base text-gray-500 md:text-xl">
        {message}
      </p>
    </div>
  );
};

export default AccessDenied;