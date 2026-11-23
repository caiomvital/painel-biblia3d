'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/game';
import { AuctionTabs, type AuctionView } from '@/components/student/auction/Tabs';
import { BalanceBar } from '@/components/student/auction/BalanceBar';
import { BidDialog } from '@/components/student/auction/BidDialog';
import { ItemCard } from '@/components/student/auction/ItemCard';
import { MyBidsList } from '@/components/student/auction/MyBidsList';
import { Statement } from '@/components/student/auction/Statement';
import { WinCelebration } from '@/components/student/auction/WinCelebration';
import { WindowNotice, type BidWindow } from '@/components/student/auction/WindowNotice';
import { AUCTION_TEXT as T, howLines } from '@/components/student/auction/copy';

export interface AuctionItem {
  id: string;
  title: string;
  category: 'Equipamento' | 'Mentoria' | 'Swag Oficial' | 'Certificação' | 'Livros' | string;
  description: string;
  imageUrl?: string;
  iconType: 'keyboard' | 'mentorship' | 'swag' | 'book' | 'cert' | 'headphone' | string;
  currentBid: number;
  minNextBid: number;
  highestBidder: string;
  isMyHighestBid: boolean;
  totalBids: number;
  endsInSeconds: number;
  marketValue: string;
  isFeatured?: boolean;
  status?: string;
}

export type StudentItemBidStatus = 'LIDERANDO' | 'SUPERADO' | 'ARREMATADO' | 'ENCERRADO';

export interface StudentBidHistoryEntry {
  id: string;
  amount: number;
  createdAt: string;
}

export interface StudentAuctionItemBidSummary {
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  itemDescription: string;
  itemIconType: string;
  itemStatus: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  itemCurrentBid: number;
  highestBidderId: string | null;
  highestBidderName: string;
  isCurrentUserLeading: boolean;
  studentStatus: StudentItemBidStatus;
  statusLabel: string;
  studentLastBid: number;
  studentLastBidAt: string;
  reservedCoins: number;
  hasReleasedReservation: boolean;
  winningBid?: number;
  spentCoins?: number;
  bidsHistory: StudentBidHistoryEntry[];
}

export interface StudentCoinTransactionItem {
  id: string;
  type: 'BASELINE' | 'EARNED' | 'SPENT' | 'MANUAL';
  friendlyType: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface AuctionSectionProps {
  userRole?: 'ALUNO' | 'PROFESSOR' | 'DIRETOR';
  userName?: string;
  userBalance?: number;
  coinBalance?: number;
  reservedCoins?: number;
  availableCoins?: number;
  onBidSuccess?: (newBalance: number) => void;
  compactView?: boolean;
  externalOpenItem?: AuctionItem | null;
  onResetExternalOpenItem?: () => void;
}

export const AuctionSection: React.FC<AuctionSectionProps> = ({
  userRole = 'ALUNO',
  userName = 'Você',
  userBalance = 1240,
  coinBalance: propCoinBalance,
  reservedCoins: propReservedCoins,
  availableCoins: propAvailableCoins,
  onBidSuccess,
  compactView = false,
  externalOpenItem,
  onResetExternalOpenItem,
}) => {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [biddingSuccess, setBiddingSuccess] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AuctionView>('lots');
  const [showHow, setShowHow] = useState(false);
  const [bidWindow, setBidWindow] = useState<BidWindow | null>(null);
  const [myBids, setMyBids] = useState<StudentAuctionItemBidSummary[]>([]);
  const [coinTransactions, setCoinTransactions] = useState<StudentCoinTransactionItem[]>([]);

  const [studentCoins, setStudentCoins] = useState<{
    coinBalance: number;
    reservedCoins: number;
    availableCoins: number;
  }>({
    coinBalance: propCoinBalance ?? userBalance,
    reservedCoins: propReservedCoins ?? 0,
    availableCoins: propAvailableCoins ?? userBalance,
  });
  const currentBalance = studentCoins.availableCoins;

  const loadAuctionData = useCallback(() => {
    fetch('/api/auction')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items);
        }
        if (data.studentCoins) {
          setStudentCoins({
            coinBalance: data.studentCoins.coinBalance ?? 0,
            reservedCoins: data.studentCoins.reservedCoins ?? 0,
            availableCoins: data.studentCoins.availableCoins ?? 0,
          });
        }
        if (data.myBids && Array.isArray(data.myBids)) {
          setMyBids(data.myBids);
        }
        if (data.bidWindow) setBidWindow(data.bidWindow); // campo aditivo de GET /api/auction
        if (data.coinTransactions && Array.isArray(data.coinTransactions)) {
          setCoinTransactions(data.coinTransactions);
        }
      })
      .catch(() => {
        // Falha silenciosa de conexão mantendo dados locais
      });
  }, []);

  useEffect(() => {
    loadAuctionData();
  }, [loadAuctionData]);

  useEffect(() => {
    if (!externalOpenItem) return;
    const timer = setTimeout(() => {
      setSelectedItem(externalOpenItem);
      setBidAmount(externalOpenItem.minNextBid);
      setBiddingSuccess(null);
      setBidError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [externalOpenItem]);

  // Só exibição: atualiza prêmios, saldos e a janela a cada 15 s (aba visível), para o cartão
  // nunca ficar com um mínimo diferente do que o servidor vai aceitar.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) loadAuctionData();
    }, 15000);
    return () => clearInterval(timer);
  }, [loadAuctionData]);

  // Live countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          endsInSeconds: Math.max(0, item.endsInSeconds - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenBidModal = (item: AuctionItem) => {
    setSelectedItem(item);
    setBidAmount(item.minNextBid);
    setBiddingSuccess(null);
    setBidError(null);
  };


  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const handleWithdraw = async (itemId: string) => {
    setWithdrawing(itemId);
    setBidError(null);
    try {
      const res = await fetch(`/api/auction?itemId=${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível retirar o lance.');
      setBiddingSuccess('Lance retirado! Suas fichas já estão livres para outro prêmio.');
      loadAuctionData();
    } catch (e: any) {
      setBidError(e.message);
    } finally {
      setWithdrawing(null);
    }
  };

  const handleOpenBidForItemById = (itemId: string) => {
    const targetItem = items.find((it) => it.id === itemId);
    if (targetItem) {
      handleOpenBidModal(targetItem);
    }
  };

  const handleConfirmBid = async () => {
    if (!selectedItem) return;
    setBidError(null);

    if (bidAmount < selectedItem.minNextBid) {
      setBidError(`O lance mínimo precisa ser de pelo menos ${selectedItem.minNextBid} fichas.`);
      return;
    }

    if (bidAmount > currentBalance) {
      setBidError(`Saldo insuficiente de fichas. Você possui ${currentBalance} fichas disponíveis e o lance é de ${bidAmount} fichas.`);
      return;
    }

    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          amount: bidAmount,
          bidderName: `${userName} (Você)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBidError(data.error || 'Erro ao processar lance.');
        return;
      }

      if (data.item) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === selectedItem.id
              ? {
                  ...it,
                  currentBid: data.item.currentBid,
                  minNextBid: data.item.minNextBid,
                  highestBidder: `${userName} (Você)`,
                  isMyHighestBid: true,
                  totalBids: data.item.totalBids,
                }
              : it
          )
        );
      }

      if (data.studentCoins) {
        setStudentCoins({
          coinBalance: data.studentCoins.coinBalance ?? 0,
          reservedCoins: data.studentCoins.reservedCoins ?? 0,
          availableCoins: data.studentCoins.availableCoins ?? 0,
        });
        if (onBidSuccess) onBidSuccess(data.studentCoins.availableCoins ?? 0);
      }

      if (data.myBids && Array.isArray(data.myBids)) {
        setMyBids(data.myBids);
      } else {
        loadAuctionData();
      }

      setBiddingSuccess(`Parabéns! Seu lance de ${bidAmount} fichas foi registrado com sucesso e você lidera a disputa!`);
      setTimeout(() => {
        setSelectedItem(null);
        setBiddingSuccess(null);
      }, 2000);
    } catch (err: any) {
      setBidError(err.message || 'Erro de conexão ao enviar lance.');
    }
  };

  const notice = !selectedItem && (biddingSuccess || bidError);

  return (
    <div className="space-y-4" data-testid="auction-screen">
      {/* No computador o saldo vai para uma coluna ao lado e os números do leilão preenchem a faixa de cima. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-5">
      <div className="lg:col-start-1">
        <h1 className="font-[family-name:var(--font-game-title)] text-3xl tracking-wide lg:text-4xl">{T.title}</h1>
        <p className="text-game-ink-dim">{T.intro}</p>
      </div>

      <div className="lg:col-start-1"><WindowNotice window={bidWindow} /></div>

      <div className="lg:col-start-2 lg:row-span-4 lg:row-start-1">
        <BalanceBar available={studentCoins.availableCoins} reserved={studentCoins.reservedCoins} total={studentCoins.coinBalance} />
      </div>

      <div className="hidden grid-cols-3 gap-3 lg:col-start-1 lg:grid" data-testid="auction-stats">
        {[
          ['Prêmios abertos', items.filter((i) => i.endsInSeconds > 0).length],
          ['Você está liderando', items.filter((i) => i.isMyHighestBid).length],
          ['Meus lances', myBids.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-game-lg border-2 border-game-line bg-game-surface px-4 py-3">
            <p className="text-sm text-game-ink-dim">{label}</p>
            <p className="font-[family-name:var(--font-game-title)] text-3xl leading-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="lg:col-start-1">
        <Button variant="ghost" aria-expanded={showHow} aria-controls="auction-how" onClick={() => setShowHow((v) => !v)}>{T.howTitle}</Button>
        {showHow && (
          <ul id="auction-how" className="mt-2 list-disc space-y-1 rounded-game-lg bg-game-surface p-4 pl-8 text-game-ink-dim">
            {howLines(bidWindow).map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>
      </div>

      {notice && (
        <p role={bidError ? 'alert' : 'status'} className={`rounded-game border-2 bg-game-surface p-3 font-semibold ${bidError ? 'border-game-danger' : 'border-game-success'}`}>
          {bidError || biddingSuccess}
        </p>
      )}

      <AuctionTabs
        value={viewMode}
        onChange={setViewMode}
        items={[
          { id: 'lots', label: T.tabs.lots },
          { id: 'my-bids', label: T.tabs.mine, count: myBids.length },
          { id: 'statement', label: T.tabs.history },
        ]}
      />

      {viewMode === 'lots' && (
        items.length === 0 ? (
          <p className="py-8 text-center text-game-ink-dim">{T.noItems}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} balance={currentBalance} withdrawing={withdrawing === item.id}
                onBid={handleOpenBidModal} onWithdraw={handleWithdraw} />
            ))}
          </div>
        )
      )}
      {viewMode === 'my-bids' && <MyBidsList bids={myBids} />}
      {viewMode === 'statement' && <Statement transactions={coinTransactions} />}

      {selectedItem && (
        <BidDialog item={items.find((i) => i.id === selectedItem.id) ?? selectedItem} amount={bidAmount} balance={currentBalance} error={bidError} success={biddingSuccess}
          onAmount={setBidAmount} onConfirm={handleConfirmBid} onClose={() => setSelectedItem(null)} />
      )}

      <WinCelebration bids={myBids} />
    </div>
  );
};
