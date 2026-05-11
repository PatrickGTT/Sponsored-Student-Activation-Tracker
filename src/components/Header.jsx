function TabBtn({ active, onClick, children, badge, badgeTone }) {
  const badgeColor = !badge
    ? ''
    : badgeTone === 'red'
    ? active
      ? 'bg-red-100 text-red-700'
      : 'bg-red-100 text-red-700'
    : active
    ? 'bg-blue-100 text-blue-700'
    : 'bg-slate-200 text-slate-700'

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          className={`inline-flex items-center justify-center min-w-[20px] px-1.5 h-5 text-xs rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function Header({
  view,
  onChangeView,
  currentUser,
  onChangeUser,
  ossUsers,
  myStudentsCount,
  priorityCount,
}) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 pt-4 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Sponsored Student Activation Tracker
          </h1>
          <p className="text-sm text-slate-500">{today}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Logged in as</span>
          <select
            value={currentUser || ''}
            onChange={(e) => onChangeUser(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ossUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 pb-3">
        <nav className="inline-flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
          <TabBtn
            active={view === 'dashboard'}
            onClick={() => onChangeView('dashboard')}
          >
            Dashboard
          </TabBtn>
          <TabBtn
            active={view === 'daily_report'}
            onClick={() => onChangeView('daily_report')}
          >
            Daily Report
          </TabBtn>
          <TabBtn
            active={view === 'my_students'}
            onClick={() => onChangeView('my_students')}
            badge={myStudentsCount}
          >
            My Students
          </TabBtn>
          <TabBtn
            active={view === 'priority'}
            onClick={() => onChangeView('priority')}
            badge={priorityCount}
            badgeTone="red"
          >
            Priority This Week
          </TabBtn>
          <TabBtn active={view === 'all'} onClick={() => onChangeView('all')}>
            All Sponsored Students
          </TabBtn>
          <TabBtn active={view === 'forecast'} onClick={() => onChangeView('forecast')}>
            Forecast
          </TabBtn>
          <TabBtn active={view === 'help'} onClick={() => onChangeView('help')}>
            How It Works
          </TabBtn>
        </nav>
      </div>
    </div>
  )
}
