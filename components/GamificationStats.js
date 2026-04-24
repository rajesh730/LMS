"use client";

import { useState, useEffect } from "react";
import { FaTrophy, FaMedal, FaStar, FaCrown } from "react-icons/fa";

export default function GamificationStats() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/student/leaderboard");
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.data);
          const me = data.data.find((s) => s.isMe);
          if (me) setMyStats(me);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-slate-800/50 rounded-xl"></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* My Badges & Stats */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <FaTrophy className="text-9xl text-yellow-400" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FaMedal className="text-yellow-400" /> My Achievements
        </h3>

        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{myStats?.points || 0}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Points</div>
          </div>
          <div className="w-px h-12 bg-slate-700"></div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{myStats?.badgesCount || 0}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Badges Earned</div>
          </div>
        </div>

        {/* Badges List (Placeholder for now, can be expanded) */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {myStats?.badgesCount > 0 ? (
            <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm border border-yellow-500/30">
              <FaStar /> High Scorer
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">Complete quizzes to earn badges!</p>
          )}
        </div>
      </div>

      {/* Class Leaderboard */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FaCrown className="text-yellow-500" /> Class Leaderboard
        </h3>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {leaderboard.map((student, index) => (
            <div 
              key={student.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                student.isMe 
                  ? "bg-blue-500/20 border-blue-500/50" 
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? "bg-yellow-500 text-black" :
                  index === 1 ? "bg-slate-400 text-black" :
                  index === 2 ? "bg-amber-700 text-white" :
                  "bg-slate-700 text-slate-300"
                }`}>
                  {index + 1}
                </div>
                <span className={`font-medium ${student.isMe ? "text-blue-400" : "text-slate-300"}`}>
                  {student.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400 font-bold">
                {student.points} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
            </div>
          ))}
          
          {leaderboard.length === 0 && (
            <p className="text-slate-500 text-center py-4">No points earned yet. Be the first!</p>
          )}
        </div>
      </div>
    </div>
  );
}
