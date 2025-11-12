import React, { useState, useEffect } from 'react';
import { Calculator, TrendingDown, TrendingUp, FileText, Upload } from 'lucide-react';

const TVACalculator = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [months, setMonths] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fileLoaded, setFileLoaded] = useState(false);

  useEffect(() => {
    loadFromClaudeFS();
  }, []);

  const loadFromClaudeFS = async () => {
    setLoading(true);
    try {
      const csvContent = await window.fs.readFile('Qonto Connect - PIGANEAU QUENTIN - Sheet1.csv', { encoding: 'utf8' });
      parseCSV(csvContent);
    } catch (error) {
      console.log('Aucun fichier trouvé dans Claude FS:', error);
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        parseCSV(content);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const emittedAtIndex = headers.indexOf('emitted at');
    const sideIndex = headers.indexOf('side');
    const amountIndex = headers.indexOf('amount');
    const vatAmountIndex = headers.indexOf('vat amount');
    const counterpartyIndex = headers.indexOf('counterparty name');
    const categoryIndex = headers.indexOf('category');

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      const emittedAt = values[emittedAtIndex];
      if (!emittedAt) continue;

      const date = new Date(emittedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      data.push({
        date: emittedAt,
        monthKey: monthKey,
        side: values[sideIndex],
        amount: parseFloat(values[amountIndex]) || 0,
        vatAmount: parseFloat(values[vatAmountIndex]) || 0,
        counterparty: values[counterpartyIndex],
        category: values[categoryIndex]
      });
    }

    setTransactions(data);
    
    const uniqueMonths = [...new Set(data.map(t => t.monthKey))].sort().reverse();
    setMonths(uniqueMonths);
    
    if (uniqueMonths.length > 0) {
      setSelectedMonth(uniqueMonths[0]);
    }
    
    setFileLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedMonth && transactions.length > 0) {
      calculateTVA(selectedMonth);
    }
  }, [selectedMonth]);

  const calculateTVA = (month) => {
    const filtered = transactions.filter(t => t.monthKey === month);

    const tvaDeductible = filtered
      .filter(t => t.side === 'debit' && t.vatAmount > 0)
      .reduce((sum, t) => sum + t.vatAmount, 0);

    const tvaCollectee = filtered
      .filter(t => t.side === 'credit' && t.vatAmount > 0)
      .reduce((sum, t) => sum + t.vatAmount, 0);

    const tvaPayer = tvaCollectee - tvaDeductible;

    const debits = filtered.filter(t => t.side === 'debit' && t.vatAmount > 0);
    const credits = filtered.filter(t => t.side === 'credit' && t.vatAmount > 0);

    setSummary({
      tvaDeductible,
      tvaCollectee,
      tvaPayer,
      debits,
      credits,
      totalTransactions: filtered.length
    });
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!fileLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-800">Calculateur TVA</h1>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Téléchargez votre fichier CSV exporté depuis Google Sheets pour commencer.
            </p>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-12 h-12 text-indigo-600 mb-3" />
              <p className="mb-2 text-sm text-gray-700">
                <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
              </p>
              <p className="text-xs text-gray-500">Fichier CSV uniquement</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv"
              onChange={handleFileUpload}
            />
          </label>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Exportez votre Google Sheet en CSV via Fichier → Télécharger → Valeurs séparées par des virgules (.csv)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Calculateur TVA Déductible</h1>
            </div>
            <button
              onClick={() => setFileLoaded(false)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Charger un autre fichier
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un mois
            </label>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>

          {summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">TVA Collectée</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.tvaCollectee)}</p>
                  <p className="text-xs text-green-600 mt-1">{summary.credits.length} vente(s)</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-700">TVA Déductible</span>
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{formatCurrency(summary.tvaDeductible)}</p>
                  <p className="text-xs text-orange-600 mt-1">{summary.debits.length} achat(s)</p>
                </div>

                <div className={`bg-gradient-to-br ${summary.tvaPayer >= 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-blue-50 to-blue-100 border-blue-200'} p-6 rounded-xl border`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${summary.tvaPayer >= 0 ? 'text-red-700' : 'text-blue-700'}`}>
                      {summary.tvaPayer >= 0 ? 'TVA à Payer' : 'Crédit de TVA'}
                    </span>
                    <FileText className={`w-5 h-5 ${summary.tvaPayer >= 0 ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  <p className={`text-2xl font-bold ${summary.tvaPayer >= 0 ? 'text-red-900' : 'text-blue-900'}`}>
                    {formatCurrency(Math.abs(summary.tvaPayer))}
                  </p>
                  <p className={`text-xs ${summary.tvaPayer >= 0 ? 'text-red-600' : 'text-blue-600'} mt-1`}>
                    {summary.tvaPayer >= 0 ? 'À verser à l\'État' : 'L\'État vous doit'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Formule de calcul</h3>
                <p className="text-sm text-gray-600">
                  TVA à payer = TVA collectée ({formatCurrency(summary.tvaCollectee)}) - TVA déductible ({formatCurrency(summary.tvaDeductible)}) = <span className="font-semibold">{formatCurrency(summary.tvaPayer)}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-green-600 text-white px-4 py-3">
                    <h3 className="font-semibold">Détail TVA Collectée ({summary.credits.length})</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {summary.credits.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {summary.credits.map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-600">
                                {new Date(t.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-2 text-gray-800">{t.counterparty}</td>
                              <td className="px-4 py-2 text-right font-medium text-green-600">
                                {formatCurrency(t.vatAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-center text-gray-500">Aucune vente avec TVA ce mois-ci</p>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-600 text-white px-4 py-3">
                    <h3 className="font-semibold">Détail TVA Déductible ({summary.debits.length})</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {summary.debits.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fournisseur</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {summary.debits.map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-600">
                                {new Date(t.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-2 text-gray-800">{t.counterparty}</td>
                              <td className="px-4 py-2 text-right font-medium text-orange-600">
                                {formatCurrency(t.vatAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-center text-gray-500">Aucun achat avec TVA ce mois-ci</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📊 Comment ça marche ?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>TVA Collectée</strong> : TVA que vous percevez sur vos ventes (transactions "credit")</li>
            <li>• <strong>TVA Déductible</strong> : TVA que vous payez sur vos achats professionnels (transactions "debit")</li>
            <li>• <strong>TVA à Payer</strong> : Si positive, montant à reverser à l'État</li>
            <li>• <strong>Crédit de TVA</strong> : Si négative, l'État vous doit de l'argent (à reporter ou à rembourser)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TVACalculator;
