// components/animated/index.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState } from 'react';
import {
  fadeInUp,
  cardHover,
  cardScale,
  buttonTap,
  modalOverlay,
  modalContent,
  collapse,
  statusBadge,
  formField,
  tableRow,
  timelineItem,
  staggerContainer,
  staggerItem,
  pageTransition
} from '@/lib/animations';

// ============================================
// ANIMATED CARD
// ============================================
interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function AnimatedCard({ 
  children, 
  onClick, 
  className = '',
  hover = true,
  delay = 0
}: AnimatedCardProps) {
  const hoverProps = hover ? cardHover : {};
  
  return (
    <motion.div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      initial={cardScale.initial}
      animate={cardScale.animate}
      exit={cardScale.exit}
      transition={{ duration: 0.4, delay }}
      {...hoverProps}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ANIMATED BUTTON
// ============================================
interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
  type = 'button'
}: AnimatedButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      whileTap={buttonTap.whileTap}
      whileHover={buttonTap.whileHover}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}

// ============================================
// ANIMATED STATUS BADGE
// ============================================
interface AnimatedStatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'purple';
  delay?: number;
}

export function AnimatedStatusBadge({ 
  status, 
  variant = 'info',
  delay = 0
}: AnimatedStatusBadgeProps) {
  const variants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <motion.span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border-2 ${variants[variant]}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay,
        type: "spring",
        stiffness: 500,
        damping: 30
      }}
    >
      {status}
    </motion.span>
  );
}

// ============================================
// INPUT COMPONENT
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

export function Input({ icon, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full rounded-lg border bg-white
            ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5
            text-gray-900 placeholder-gray-400
            border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            transition-all duration-200
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
        />
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ============================================
// SELECT COMPONENT
// ============================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: ReactNode;
  error?: string;
}

export function Select({ icon, error, className = '', children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          {...props}
          className={`
            w-full rounded-lg border bg-white
            ${icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5
            text-gray-900
            border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            transition-all duration-200
            appearance-none cursor-pointer
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ============================================
// TABLE SKELETON
// ============================================
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header Skeleton */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-8 gap-4 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div 
              key={i} 
              className="h-4 bg-gray-200 rounded animate-pulse"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
      
      {/* Rows Skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 p-4">
            {Array.from({ length: 8 }).map((_, j) => (
              <motion.div 
                key={j} 
                className="h-4 bg-gray-100 rounded animate-pulse"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: (i * 8 + j) * 0.05 }}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// EMPTY STATE
// ============================================
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl border border-gray-200 p-12 text-center"
    >
      <motion.div 
        className="flex justify-center mb-4 text-gray-300"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        {icon}
      </motion.div>
      <motion.h3 
        className="text-xl font-semibold text-gray-900 mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h3>
      <motion.p 
        className="text-gray-500 mb-6 max-w-md mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {description}
      </motion.p>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatedButton
            variant="primary"
            onClick={action.onClick}
          >
            {action.label}
          </AnimatedButton>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// ENHANCED STAT CARD
// ============================================
interface EnhancedStatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  change?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  imageUrl?: string;
}

export function EnhancedStatCard({ 
  icon, 
  label, 
  value, 
  change, 
  color = 'blue',
  imageUrl 
}: EnhancedStatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-200',
    green: 'from-green-500/10 to-green-600/10 border-green-200',
    yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-200',
    red: 'from-red-500/10 to-red-600/10 border-red-200',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-200',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white h-full">
      {/* Background Image */}
      {imageUrl && (
        <div className="absolute inset-0 opacity-5">
          <img 
            src={imageUrl} 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]}`} />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-lg ${iconColorClasses[color]}`}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {icon}
          </motion.div>
          {change && (
            <motion.span 
              className={`text-sm font-medium ${
                change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {change}
            </motion.span>
          )}
        </div>
        
        <motion.div 
          className="text-3xl font-bold text-gray-900 mb-1"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        >
          {value}
        </motion.div>
        
        <div className="text-sm text-gray-600 font-medium">
          {label}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ALERT COMPONENT
// ============================================
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
}

export function Alert({ variant = 'info', title, message, onClose }: AlertProps) {
  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const iconMap = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border p-4 ${variantClasses[variant]}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0">{iconMap[variant]}</span>
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// ANIMATED TABLE
// ============================================
interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
}

interface AnimatedTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export function AnimatedTable({ columns, data, onRowClick }: AnimatedTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <motion.th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {column.label}
              </motion.th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <AnimatePresence mode="popLayout">
            {data.map((row, rowIndex) => (
              <motion.tr
                key={row._id || row.id || rowIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ 
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  transition: { duration: 0.2 }
                }}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(row)}
                layout
                transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// PAGE HEADER
// ============================================
interface PageHeaderProps {
  icon: ReactNode;
  title: string | ReactNode;
  description?: string | ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
  return (
    <motion.div 
      className="mb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/30 flex-shrink-0"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {icon}
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">{title}</h1>
            {description && (
              <p className="text-blue-100 mt-1 text-sm sm:text-base drop-shadow-md">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </motion.div>
  );
}

// ============================================
// ANIMATED PAGE WRAPPER
// ============================================
export function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ANIMATED MODAL
// ============================================
interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AnimatedModal({ 
  isOpen, 
  onClose, 
  children, 
  title,
  maxWidth = 'md'
}: AnimatedModalProps) {
  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`bg-white rounded-xl p-6 ${widths[maxWidth]} w-full shadow-2xl`}>
              {title && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// ANIMATED COLLAPSIBLE
// ============================================
interface AnimatedCollapsibleProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AnimatedCollapsible({ 
  title, 
  children, 
  defaultOpen = false,
  className = ''
}: AnimatedCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <motion.button
        className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ANIMATED LIST
// ============================================
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      variants={staggerItem}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ANIMATED TIMELINE
// ============================================
interface TimelineEvent {
  status: string;
  date: string;
  location?: string;
  description?: string;
}

interface AnimatedTimelineProps {
  events: TimelineEvent[];
  activeIndex?: number;
}

export function AnimatedTimeline({ events, activeIndex }: AnimatedTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <motion.div
          key={index}
          className="flex gap-4"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-4 h-4 rounded-full ${
                activeIndex !== undefined && index <= activeIndex
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
            />
            {index < events.length - 1 && (
              <motion.div 
                className="w-0.5 h-full bg-gray-200 mt-2"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                style={{ originY: 0 }}
              />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="font-medium text-gray-900">{event.status}</p>
            <p className="text-sm text-gray-600">{event.date}</p>
            {event.location && (
              <p className="text-sm text-gray-500">{event.location}</p>
            )}
            {event.description && (
              <p className="text-sm text-gray-500 mt-1">{event.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// ANIMATED FORM FIELD
// ============================================
interface AnimatedFormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  delay?: number;
}

export function AnimatedFormField({ 
  label, 
  children, 
  error, 
  required,
  delay = 0
}: AnimatedFormFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay }}
      className="mb-4"
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-red-500 text-sm mt-1"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}