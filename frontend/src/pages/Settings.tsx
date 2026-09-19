import React, { useState } from 'react';
import { User, Bell, Palette, ShieldCheck, Sliders, Edit3, Trash2, Camera, Sparkles, Check } from 'lucide-react';
import { authService } from '../services/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';

export const Settings: React.FC = () => {
  const currentUser = authService.getUser();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'appearance' | 'privacy' | 'preferences'>('account');

  const [fullName, setFullName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [studentId, setStudentId] = useState(currentUser.studentId || '2301CS123');
  const [bio, setBio] = useState(currentUser.bio || 'Computer Science student passionate about cloud and AI.');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    authService.setUser({
      ...currentUser,
      name: fullName,
      email,
      studentId,
      bio,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {/* Settings Header matching Screenshot Page 4 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-stayon-purple text-white flex items-center justify-center shadow-lg shadow-stayon-purple/30">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Customize your StayOn experience
            </p>
          </div>
        </div>

        {/* Decorative Quote in top right */}
        <div className="hidden lg:block handwriting-note text-xs text-purple-600 opacity-90 text-right">
          "A more focused you<br />is a brighter tomorrow."
        </div>
      </div>

      {/* Main Grid: Left Tabs + Middle Content + Right Profile Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Navigation Tabs (3 cols) */}
        <div className="lg:col-span-3 space-y-2">
          <Card className="p-2 space-y-1 bg-white/90">
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'account'
                  ? 'stayon-pill-active'
                  : 'text-slate-600 hover:bg-stayon-lavender/40'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'notifications'
                  ? 'stayon-pill-active'
                  : 'text-slate-600 hover:bg-stayon-lavender/40'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'appearance'
                  ? 'stayon-pill-active'
                  : 'text-slate-600 hover:bg-stayon-lavender/40'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'privacy'
                  ? 'stayon-pill-active'
                  : 'text-slate-600 hover:bg-stayon-lavender/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy & Security</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'preferences'
                  ? 'stayon-pill-active'
                  : 'text-slate-600 hover:bg-stayon-lavender/40'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Preferences</span>
            </button>
          </Card>
        </div>

        {/* Middle Settings Form Area (6 cols) matching Screenshot Page 4 */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 sm:p-8 bg-white/90">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Account Information</h3>
                <p className="text-xs text-slate-400 font-medium">Manage your profile details.</p>
              </div>

              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stayon-lavender text-stayon-purple text-xs font-bold hover:bg-stayon-lavender/80 transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Profile Avatar Edit */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar src={currentUser.avatarUrl} name={fullName} size="lg" />
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-stayon-purple text-white rounded-full border-2 border-white shadow-md hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{fullName}</h4>
                  <span className="text-xs text-slate-400 font-medium">{email}</span>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="stayon-input w-full py-2.5 px-3.5 text-sm text-slate-800"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="stayon-input w-full py-2.5 px-3.5 text-sm text-slate-800"
                />
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Student ID (Optional)</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="stayon-input w-full py-2.5 px-3.5 text-sm text-slate-800"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bio (Optional)</label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="stayon-input w-full py-2.5 px-3.5 text-sm text-slate-800 resize-y"
                />
                <span className="text-[11px] text-slate-400 font-medium float-right mt-1">
                  {bio.length}/200
                </span>
              </div>

              {/* Save changes button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                {isSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved successfully!
                  </span>
                )}
                <Button type="submit" variant="stayon-gradient" className="px-6 shadow-md">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Danger Zone matching Screenshot Page 4 */}
          <Card className="p-6 bg-red-50/50 border border-red-100">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-red-900">Danger Zone</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              These actions are permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-red-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Delete Account</h4>
                <p className="text-[11px] text-slate-400">Permanently delete your StayOn account and all your data.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => alert('Account deletion requires explicit user confirmation. Backend endpoint is isolated.')}
              >
                Delete Account
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Profile Preview Column (3 cols) matching Screenshot Page 4 */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 text-center bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-100">
            <div className="flex items-center justify-center gap-1.5 text-stayon-purple text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Profile Preview</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">This is how your name appears in StayOn.</p>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center">
              <Avatar src={currentUser.avatarUrl} name={fullName} size="lg" className="mb-2" />
              <h4 className="text-sm font-bold text-slate-900">{fullName}</h4>
              <span className="text-xs text-slate-400 font-medium mb-3">Student</span>
              <span className="inline-block px-3 py-1 rounded-full bg-stayon-lavender text-stayon-purple text-xs font-bold">
                Keep going! ✨
              </span>
            </div>
          </Card>

          {/* Decorative handwriting quotes matching Screenshot Page 4 */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-100/50 to-pink-100/50 border border-purple-100 space-y-3 text-center">
            <p className="handwriting-note text-xs text-purple-700">
              GOOD HABITS BRIGHTER DAYS ♡
            </p>
            <p className="handwriting-note text-xs text-slate-600">
              DISCIPLINE CREATES FREEDOM ♡
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
