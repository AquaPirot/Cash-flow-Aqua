'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Minus, DollarSign, Clock, Calendar, HandCoins, ArrowLeft, Download, Upload, Filter, X, Trash2 } from 'lucide-react';

// TypeScript tipovi
type TransactionType = 'add' | 'subtract' | 'loan_given' | 'loan_returned' | 'loan_partial' | 'initial';

type Transaction = {
  id: number;
  type: TransactionType;
  amountRsd: number;
  amountEur: number;
  description: string;
  date: string;
  timestamp: string;
  loanId?: number; // ID pozajmice za parcijalna vraćanja
};

type Loan = {
  id: number;
  originalAmountRsd: number; // Originalni iznos
  originalAmountEur: number;
  currentAmountRsd: number;  // Trenutni iznos (posle rata)
  currentAmountEur: number;
  description: string;
  date: string;
  timestamp: string;
  isActive: boolean;
};

export default function CashFlowApp() {
  const [balance, setBalance] = useState<number>(0);
  const [balanceEur, setBalanceEur] = useState<number>(0);
  const [initialBalance, setInitialBalance] = useState<string>('');
  const [initialBalanceEur, setInitialBalanceEur] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [amountEur, setAmountEur] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
  // Modal state za rate
  const [showPartialModal, setShowPartialModal] = useState<boolean>(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [partialAmountRsd, setPartialAmountRsd] = useState<string>('');
  const [partialAmountEur, setPartialAmountEur] = useState<string>('');

  // Učitaj podatke iz localStorage kad se komponenta učita
  useEffect(() => {
    const savedData = localStorage.getItem('cashFlowData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setBalance(data.balance || 0);
        setBalanceEur(data.balanceEur || 0);
        setTransactions(data.transactions || []);
        
        // Migracija starih pozajmica koje nemaju currentAmount polja
        const migratedLoans = (data.loans || []).map((loan: Partial<Loan> & { amountRsd?: number; amountEur?: number }) => ({
          ...loan,
          originalAmountRsd: loan.originalAmountRsd || loan.amountRsd || 0,
          originalAmountEur: loan.originalAmountEur || loan.amountEur || 0,
          currentAmountRsd: loan.currentAmountRsd !== undefined ? loan.currentAmountRsd : (loan.amountRsd || 0),
          currentAmountEur: loan.currentAmountEur !== undefined ? loan.currentAmountEur : (loan.amountEur || 0),
        }));
        
        setLoans(migratedLoans);
        setIsInitialized(data.isInitialized || false);
      } catch {
        // Ignoriši greške pri parsiranju
      }
    }
    setIsLoaded(true);
  }, []);

  // Sačuvaj podatke u localStorage kad god se promeni stanje
  useEffect(() => {
    if (isLoaded && isInitialized) {
      const dataToSave = {
        balance,
        balanceEur,
        transactions,
        loans,
        isInitialized
      };
      localStorage.setItem('cashFlowData', JSON.stringify(dataToSave));
    }
  }, [balance, balanceEur, transactions, loans, isInitialized, isLoaded]);

  const initializeBalance = () => {
    const initialRsd = parseFloat(initialBalance) || 0;
    const initialEur = parseFloat(initialBalanceEur) || 0;
    setBalance(initialRsd);
    setBalanceEur(initialEur);
    setIsInitialized(true);
    setTransactions([{
      id: Date.now(),
      type: 'initial',
      amountRsd: initialRsd,
      amountEur: initialEur,
      description: 'Početno stanje',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleDateString('sr-RS')
    }]);
    setInitialBalance('');
    setInitialBalanceEur('');
  };

  const addTransaction = (type: 'add' | 'subtract' | 'loan') => {
    const valueRsd = parseFloat(amount) || 0;
    const valueEur = parseFloat(amountEur) || 0;
    
    if ((!valueRsd && !valueEur) || !description.trim()) return;

    const newTransaction: Transaction = {
      id: Date.now(),
      type: type === 'loan' ? 'loan_given' : type,
      amountRsd: valueRsd,
      amountEur: valueEur,
      description: description.trim(),
      date: transactionDate,
      timestamp: new Date(transactionDate).toLocaleDateString('sr-RS')
    };

    if (type === 'add') {
      setBalance(prev => prev + valueRsd);
      setBalanceEur(prev => prev + valueEur);
    } else if (type === 'subtract') {
      setBalance(prev => prev - valueRsd);
      setBalanceEur(prev => prev - valueEur);
    } else if (type === 'loan') {
      setBalance(prev => prev - valueRsd);
      setBalanceEur(prev => prev - valueEur);
      const newLoan: Loan = {
        id: Date.now(),
        originalAmountRsd: valueRsd,
        originalAmountEur: valueEur,
        currentAmountRsd: valueRsd,
        currentAmountEur: valueEur,
        description: description.trim(),
        date: transactionDate,
        timestamp: new Date(transactionDate).toLocaleDateString('sr-RS'),
        isActive: true
      };
      setLoans(prev => [...prev, newLoan]);
    }

    setTransactions(prev => [newTransaction, ...prev]);
    setAmount('');
    setAmountEur('');
    setDescription('');
  };

  const returnLoan = (loanId: number) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    setBalance(prev => prev + loan.currentAmountRsd);
    setBalanceEur(prev => prev + loan.currentAmountEur);
    
    setLoans(prev => prev.map(l => 
      l.id === loanId ? { ...l, isActive: false } : l
    ));

    const returnTransaction: Transaction = {
      id: Date.now(),
      type: 'loan_returned',
      amountRsd: loan.currentAmountRsd,
      amountEur: loan.currentAmountEur,
      description: `Vraćena pozajmica: ${loan.description}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleDateString('sr-RS'),
      loanId: loanId
    };
    setTransactions(prev => [returnTransaction, ...prev]);
  };

  const openPartialModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setPartialAmountRsd('');
    setPartialAmountEur('');
    setShowPartialModal(true);
  };

  const closePartialModal = () => {
    setShowPartialModal(false);
    setSelectedLoan(null);
    setPartialAmountRsd('');
    setPartialAmountEur('');
  };

  const processPartialReturn = () => {
    if (!selectedLoan) return;
    
    const partialRsd = parseFloat(partialAmountRsd) || 0;
    const partialEur = parseFloat(partialAmountEur) || 0;
    
    if (!partialRsd && !partialEur) return;
    
    // Proveri da ne vraća više nego što duguje
    if (partialRsd > selectedLoan.currentAmountRsd || partialEur > selectedLoan.currentAmountEur) {
      alert('Ne možete vratiti više nego što dugujete!');
      return;
    }

    // Dodaj novac u sef
    setBalance(prev => prev + partialRsd);
    setBalanceEur(prev => prev + partialEur);

    // Smanji dugovanje
    const newCurrentRsd = selectedLoan.currentAmountRsd - partialRsd;
    const newCurrentEur = selectedLoan.currentAmountEur - partialEur;
    
    // Ako je kompletno vraćeno, deaktiviraj pozajmicu
    const isFullyReturned = newCurrentRsd === 0 && newCurrentEur === 0;
    
    setLoans(prev => prev.map(l => 
      l.id === selectedLoan.id ? { 
        ...l, 
        currentAmountRsd: newCurrentRsd,
        currentAmountEur: newCurrentEur,
        isActive: !isFullyReturned 
      } : l
    ));

    // Kreiraj transakciju
    const partialTransaction: Transaction = {
      id: Date.now(),
      type: isFullyReturned ? 'loan_returned' : 'loan_partial',
      amountRsd: partialRsd,
      amountEur: partialEur,
      description: `${isFullyReturned ? 'Završeno vraćanje' : 'Delimično vraćanje'}: ${selectedLoan.description}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleDateString('sr-RS'),
      loanId: selectedLoan.id
    };
    
    setTransactions(prev => [partialTransaction, ...prev]);
    closePartialModal();
  };

  const exportData = () => {
    const dataToExport = {
      balance,
      balanceEur,
      transactions,
      loans,
      isInitialized,
      exportDate: new Date().toISOString(),
      version: "2.0"
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `tok-gotovine-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (importedData.version && importedData.exportDate) {
          setBalance(importedData.balance || 0);
          setBalanceEur(importedData.balanceEur || 0);
          setTransactions(importedData.transactions || []);
          
          // Migracija pozajmica pri importu
          const migratedLoans = (importedData.loans || []).map((loan: Partial<Loan> & { amountRsd?: number; amountEur?: number }) => ({
            ...loan,
            originalAmountRsd: loan.originalAmountRsd || loan.amountRsd || 0,
            originalAmountEur: loan.originalAmountEur || loan.amountEur || 0,
            currentAmountRsd: loan.currentAmountRsd !== undefined ? loan.currentAmountRsd : (loan.amountRsd || 0),
            currentAmountEur: loan.currentAmountEur !== undefined ? loan.currentAmountEur : (loan.amountEur || 0),
          }));
          
          setLoans(migratedLoans);
          setIsInitialized(importedData.isInitialized || false);
          
          alert(`Podaci su uspešno učitani! Backup iz: ${new Date(importedData.exportDate).toLocaleDateString('sr-RS')}`);
        } else {
          alert('Nevaljan backup fajl!');
        }
      } catch {
        alert('Greška pri učitavanju fajla!');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const getFilteredTransactions = (): Transaction[] => {
    if (!selectedMonth) return transactions;
    return transactions.filter(transaction => {
      const transactionMonth = transaction.date.slice(0, 7);
      return transactionMonth === selectedMonth;
    });
  };

  const getAvailableMonths = (): string[] => {
    const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().reverse();
    return months;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD'
    }).format(amount);
  };

  const formatAmount = (transaction: Transaction | Loan, useCurrentAmount = false): string => {
    let rsdAmount, eurAmount;
    
    if ('currentAmountRsd' in transaction && useCurrentAmount) {
      rsdAmount = transaction.currentAmountRsd;
      eurAmount = transaction.currentAmountEur;
    } else if ('amountRsd' in transaction) {
      rsdAmount = transaction.amountRsd;
      eurAmount = transaction.amountEur;
    } else {
      rsdAmount = transaction.currentAmountRsd;
      eurAmount = transaction.currentAmountEur;
    }
    
    const parts: string[] = [];
    
    if (rsdAmount && rsdAmount > 0) {
      parts.push(formatCurrency(rsdAmount));
    }
    
    if (eurAmount && eurAmount > 0) {
      const eurFormatted = new Intl.NumberFormat('sr-RS', {
        style: 'currency',
        currency: 'EUR'
      }).format(eurAmount);
      parts.push(eurFormatted);
    }
    
    return parts.length > 0 ? parts.join(' + ') : formatCurrency(0);
  };

  const deleteTransaction = (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    if (!confirm('Da li ste sigurni da želite da obrišete ovu transakciju?')) return;

    // Ukloni transakciju iz liste
    setTransactions(prev => prev.filter(t => t.id !== transactionId));

    // Oporaviti stanje sefu u zavisnosti od tipa transakcije
    if (transaction.type === 'add') {
      setBalance(prev => prev - transaction.amountRsd);
      setBalanceEur(prev => prev - transaction.amountEur);
    } else if (transaction.type === 'subtract') {
      setBalance(prev => prev + transaction.amountRsd);
      setBalanceEur(prev => prev + transaction.amountEur);
    } else if (transaction.type === 'loan_given') {
      setBalance(prev => prev + transaction.amountRsd);
      setBalanceEur(prev => prev + transaction.amountEur);
      // Ukloni i povezanu pozajmicu
      setLoans(prev => prev.filter(l => l.timestamp !== transaction.timestamp || l.description !== transaction.description));
    } else if (transaction.type === 'loan_returned' || transaction.type === 'loan_partial') {
      setBalance(prev => prev - transaction.amountRsd);
      setBalanceEur(prev => prev - transaction.amountEur);
      
      // Za vraćene pozajmice treba biti pažljiv - ne možemo jednostavno vratiti stanje
      alert('Oprez: Brisanje transakcija vraćanja pozajmica može poremetiti stanje. Preporučuje se backup pre brisanja.');
    }
  };

  const deleteLoan = (loanId: number) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (!confirm(`Da li ste sigurni da želite da obrišete pozajmicu "${loan.description}"?`)) return;

    // Ako je pozajmica aktivna, vrati novac u sef
    if (loan.isActive) {
      setBalance(prev => prev + loan.currentAmountRsd);
      setBalanceEur(prev => prev + loan.currentAmountEur);
    }

    // Ukloni pozajmicu
    setLoans(prev => prev.filter(l => l.id !== loanId));
    
    // Ukloni sve povezane transakcije
    setTransactions(prev => prev.filter(t => 
      !(t.type === 'loan_given' && t.description === loan.description && t.timestamp === loan.timestamp) &&
      !(t.loanId === loanId)
    ));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Tok gotovine</h1>
              <p className="text-gray-600">Unesite početno stanje u sefu</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Početno stanje - Dinari (RSD)
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Početno stanje - Evri (EUR)
                </label>
                <input
                  type="number"
                  value={initialBalanceEur}
                  onChange={(e) => setInitialBalanceEur(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={initializeBalance}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Počni praćenje
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Stanje u sefu</h1>
              <div className="flex gap-2">
                <button
                  onClick={exportData}
                  className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Sačuvaj backup"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                
                <label className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                       title="Učitaj backup">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Učitaj</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Dinari u sefu</p>
                <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Evri u sefu</p>
                <div className={`text-2xl font-bold ${balanceEur >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('sr-RS', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(balanceEur)}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Duguju mi</p>
                <div className="text-2xl font-bold text-orange-600">
                  {(() => {
                    const activeLoans = loans.filter(l => l.isActive);
                    const totalRsd = activeLoans.reduce((sum, loan) => sum + loan.currentAmountRsd, 0);
                    const totalEur = activeLoans.reduce((sum, loan) => sum + loan.currentAmountEur, 0);
                    
                    const parts = [];
                    if (totalRsd > 0) parts.push(formatCurrency(totalRsd));
                    if (totalEur > 0) parts.push(new Intl.NumberFormat('sr-RS', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(totalEur));
                    
                    return parts.length > 0 ? parts.join(' + ') : formatCurrency(0);
                  })()}
                </div>
                {loans.filter(l => l.isActive).length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {loans.filter(l => l.isActive).length} aktivna{loans.filter(l => l.isActive).length === 1 ? '' : 'e'} pozajmic{loans.filter(l => l.isActive).length === 1 ? 'a' : 'e'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Nova transakcija</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dinari (RSD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evri (EUR)
              </label>
              <input
                type="number"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opis
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opis transakcije..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => addTransaction('add')}
              disabled={(!amount && !amountEur) || !description.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Dodaj sredstva</span>
              <span className="sm:hidden">Dodaj</span>
            </button>
            
            <button
              onClick={() => addTransaction('subtract')}
              disabled={(!amount && !amountEur) || !description.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Minus className="w-5 h-5" />
              <span className="hidden sm:inline">Oduzmi sredstva</span>
              <span className="sm:hidden">Oduzmi</span>
            </button>

            <button
              onClick={() => addTransaction('loan')}
              disabled={(!amount && !amountEur) || !description.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <HandCoins className="w-5 h-5" />
              <span className="hidden sm:inline">Pozajmica</span>
              <span className="sm:hidden">Pozajmi</span>
            </button>
          </div>
        </div>

        {loans.filter(l => l.isActive).length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-orange-600" />
              Aktivne pozajmice ({loans.filter(l => l.isActive).length})
            </h2>
            
            <div className="space-y-3">
              {loans.filter(l => l.isActive).map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{loan.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{loan.timestamp}</span>
                      </div>
                      {(loan.currentAmountRsd !== loan.originalAmountRsd || loan.currentAmountEur !== loan.originalAmountEur) && (
                        <div className="text-xs text-orange-600 mt-1">
                          Početno: {formatAmount(loan)} → Ostalo: {formatAmount(loan, true)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <div className="text-lg font-semibold text-orange-600">
                      {formatAmount(loan, true)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPartialModal(loan)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        Rata
                      </button>
                      <button
                        onClick={() => returnLoan(loan.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Sve
                      </button>
                      <button
                        onClick={() => deleteLoan(loan.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                        title="Obriši pozajmicu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Istorija transakcija ({getFilteredTransactions().length})
            </h2>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Svi meseci</option>
                {getAvailableMonths().map(month => (
                  <option key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('sr-RS', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {getFilteredTransactions().length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {selectedMonth ? 'Nema transakcija za izabrani mesec' : 'Nema transakcija'}
            </p>
          ) : (
            <div className="space-y-3">
              {getFilteredTransactions().map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      transaction.type === 'add' ? 'bg-green-100 text-green-600' :
                      transaction.type === 'subtract' ? 'bg-red-100 text-red-600' :
                      transaction.type === 'loan_given' ? 'bg-orange-100 text-orange-600' :
                      transaction.type === 'loan_returned' ? 'bg-blue-100 text-blue-600' :
                      transaction.type === 'loan_partial' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {transaction.type === 'add' ? <Plus className="w-5 h-5" /> :
                       transaction.type === 'subtract' ? <Minus className="w-5 h-5" /> :
                       transaction.type === 'loan_given' ? <HandCoins className="w-5 h-5" /> :
                       transaction.type === 'loan_returned' ? <ArrowLeft className="w-5 h-5" /> :
                       transaction.type === 'loan_partial' ? <ArrowLeft className="w-5 h-5" /> :
                       <DollarSign className="w-5 h-5" />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{transaction.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-lg font-semibold flex-shrink-0 ${
                    transaction.type === 'add' || transaction.type === 'loan_returned' || transaction.type === 'loan_partial' ? 'text-green-600' :
                    transaction.type === 'subtract' || transaction.type === 'loan_given' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {transaction.type === 'add' || transaction.type === 'loan_returned' || transaction.type === 'loan_partial' ? '+' : 
                     transaction.type === 'subtract' || transaction.type === 'loan_given' ? '-' : ''}
                    {formatAmount(transaction)}
                  </div>
                  
                  <button
                    onClick={() => deleteTransaction(transaction.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors ml-3"
                    title="Obriši transakciju"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal za delimično vraćanje pozajmice */}
      {showPartialModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Vratiti ratu</h3>
              <button
                onClick={closePartialModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Pozajmica: {selectedLoan.description}</p>
              <p className="text-sm text-gray-600">
                Duguje ukupno: <span className="font-medium">{formatAmount(selectedLoan, true)}</span>
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vraća - Dinari (RSD)
                </label>
                <input
                  type="number"
                  value={partialAmountRsd}
                  onChange={(e) => setPartialAmountRsd(e.target.value)}
                  placeholder="0.00"
                  max={selectedLoan.currentAmountRsd}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedLoan.currentAmountRsd > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimalno: {formatCurrency(selectedLoan.currentAmountRsd)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vraća - Evri (EUR)
                </label>
                <input
                  type="number"
                  value={partialAmountEur}
                  onChange={(e) => setPartialAmountEur(e.target.value)}
                  placeholder="0.00"
                  max={selectedLoan.currentAmountEur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedLoan.currentAmountEur > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimalno: {new Intl.NumberFormat('sr-RS', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(selectedLoan.currentAmountEur)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={closePartialModal}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={processPartialReturn}
                disabled={!partialAmountRsd && !partialAmountEur}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Potvrdi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}