/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionProvider, useSession } from './context/SessionContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LiveView } from './components/LiveView';
import { QueueView } from './components/QueueView';
import { PlayersView } from './components/PlayersView';
import { StandingsView } from './components/StandingsView';
import { SettingsView } from './components/SettingsView';
import { TvDisplayMode } from './components/TvDisplayMode';
import { QuickAttendanceSheet } from './components/QuickAttendanceSheet';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MatchShareModal } from './components/MatchShareModal';

function MainContent() {
  const { activeTab, isTvMode, activeRecapMatch, setActiveRecapMatch, players, setActiveTab } = useSession();

  if (isTvMode) {
    return <TvDisplayMode />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OfflineIndicator />
      <Header />

      <main className="flex-1 px-3 sm:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full">
        {activeTab === 'live' && <LiveView />}
        {activeTab === 'queue' && <QueueView />}
        {activeTab === 'players' && <PlayersView />}
        {activeTab === 'standings' && <StandingsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Match Share Modal & Recap Card Receipt */}
      <MatchShareModal
        isOpen={activeRecapMatch !== null}
        onClose={() => setActiveRecapMatch(null)}
        match={activeRecapMatch}
        allPlayers={players}
        onReturnToQueue={() => {
          setActiveRecapMatch(null);
          setActiveTab('queue');
        }}
      />

      {/* Slide-Up Bottom Sheet for Instant Attendance */}
      <QuickAttendanceSheet />

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <MainContent />
    </SessionProvider>
  );
}
