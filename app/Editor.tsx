'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Moon, Sun, Expand, Minimize, NotebookPen, Undo, Redo, Upload, Settings, Search, Download } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function WebEdit() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [font, setFont] = useState('sans')
  const [fontSize, setFontSize] = useState(16)
  const [text, setText] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [goalEnabled, setGoalEnabled] = useState(false)
  const [goalType, setGoalType] = useState<'words' | 'characters'>('words')
  const [goalCount, setGoalCount] = useState(0)
  const [spellCheck, setSpellCheck] = useState(true)
  const [customLayout, setCustomLayout] = useState({
    showThemeToggle: true,
    showFullscreenToggle: true,
    showUndoRedo: true,
    showWordCount: true,
    showCharCount: true,
  })
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [fileName, setFileName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const savedPreferences = localStorage.getItem('editorPreferences')
    if (savedPreferences) {
      const preferences = JSON.parse(savedPreferences)
      if (preferences) {
        setTheme(preferences.theme || 'light')
        setFont(preferences.font || 'sans')
        setFontSize(preferences.fontSize || 16)
        setSpellCheck(preferences.spellCheck ?? true)
        setCustomLayout(preferences.customLayout || {
          showThemeToggle: true,
          showFullscreenToggle: true,
          showUndoRedo: true,
          showWordCount: true,
          showCharCount: true,
        })
      }
    }

    const savedText = localStorage.getItem('editorText')
    if (savedText) {
      setText(savedText)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const preferences = { theme, font, fontSize, spellCheck, customLayout }
      localStorage.setItem('editorPreferences', JSON.stringify(preferences))
    }
  }, [theme, font, fontSize, spellCheck, customLayout])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorText', text)
    }
  }, [text])

  const toggleTheme = useCallback(() => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light'), [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else if (document.exitFullscreen) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleTextChange = useCallback((newText: string) => {
    setText(newText)
    setUndoStack(prevStack => [...prevStack, text])
    setRedoStack([])
  }, [text])

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousText = undoStack.pop()!
      setRedoStack(prevStack => [text, ...prevStack])
      setText(previousText)
      setUndoStack([...undoStack])
    }
  }, [text, undoStack])

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextText = redoStack.shift()!
      setUndoStack(prevStack => [...prevStack, text])
      setText(nextText)
      setRedoStack([...redoStack])
    }
  }, [text, redoStack])

  const handleUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        handleTextChange(content)
      }
      reader.readAsText(file)
    }
  }, [handleTextChange])

  const handleDownload = useCallback(() => {
    if (fileName) {
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowDownloadDialog(false)
      setFileName('')
    }
  }, [fileName, text])

  const handleFindReplace = useCallback((replaceAll: boolean = false) => {
    if (findText) {
      let flags = 'g'
      if (!matchCase) flags += 'i'
      const regex = useRegex ? new RegExp(findText, flags) : new RegExp(escapeRegExp(findText), flags)
      if (replaceAll) {
        const newContent = text.replace(regex, replaceText)
        handleTextChange(newContent)
      } else {
        const match = regex.exec(text)
        if (match) {
          const start = match.index
          const end = start + match[0].length
          const newContent = text.slice(0, start) + replaceText + text.slice(end)
          handleTextChange(newContent)
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(start + replaceText.length, start + replaceText.length)
            textareaRef.current.focus()
          }
        }
      }
    }
  }, [findText, replaceText, text, matchCase, useRegex, handleTextChange])

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const charCount = text.length

  const progress = goalEnabled
    ? goalType === 'words'
      ? (wordCount / goalCount) * 100
      : (charCount / goalCount) * 100
    : 0

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            handleUndo()
            break
          case 'y':
            e.preventDefault()
            handleRedo()
            break
          case 'f':
            e.preventDefault()
            setShowFindReplace(true)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <div className="h-screen flex flex-col">
        {/* Compact Header */}
        <header className="border-b shrink-0">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5" aria-hidden="true" />
              <h1 className="text-lg font-semibold hidden sm:inline-block">WebEdit</h1>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Font Controls */}
              <div className="hidden sm:flex items-center gap-2">
                <Select value={font} onValueChange={(value: string) => setFont(value)}>
                  <SelectTrigger className="w-[90px] h-8" aria-label="Select font family">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="mono">Mono</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2" role="group" aria-label="Font size control">
                  <Slider
                    id="font-size"
                    min={12}
                    max={24}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    className="w-[80px]"
                    aria-label="Adjust font size"
                  />
                  <span className="text-xs w-7" aria-label="Current font size">{fontSize}px</span>
                </div>
              </div>

              {/* Settings and Controls */}
              <div className="flex items-center gap-1">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Settings</SheetTitle>
                      <SheetDescription>Customize your WebEdit experience</SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                      {Object.entries(customLayout).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch
                            id={key}
                            checked={value}
                            onCheckedChange={(checked) => setCustomLayout(prev => ({ ...prev, [key]: checked }))}
                          />
                          <Label htmlFor={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="spell-check"
                          checked={spellCheck}
                          onCheckedChange={setSpellCheck}
                        />
                        <Label htmlFor="spell-check">Enable Spell Check</Label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="goal-switch"
                            checked={goalEnabled}
                            onCheckedChange={setGoalEnabled}
                          />
                          <Label htmlFor="goal-switch">Enable Writing Goal</Label>
                        </div>
                        {goalEnabled && (
                          <>
                            <Select value={goalType} onValueChange={(value: 'words' | 'characters') => setGoalType(value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Goal Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="words">Words</SelectItem>
                                <SelectItem value="characters">Characters</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder={`Enter ${goalType} goal`}
                              value={goalCount}
                              onChange={(e) => setGoalCount(parseInt(e.target.value) || 0)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {customLayout.showThemeToggle && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleTheme} 
                    className="h-8 w-8"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                )}
                {customLayout.showFullscreenToggle && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleFullscreen} 
                    className="h-8 w-8"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Font Controls */}
        <div className="sm:hidden border-b px-4 py-1 flex items-center justify-between">
          <Select value={font} onValueChange={(value: string) => setFont(value)}>
            <SelectTrigger className="w-[90px] h-8" aria-label="Select font family">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Mono</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2" role="group" aria-label="Font size control">
            <Slider
              id="font-size-mobile"
              min={12}
              max={24}
              step={1}
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              className="w-[100px]"
              aria-label="Adjust font size"
            />
            <span className="text-xs w-7" aria-label="Current font size">{fontSize}px</span>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Goal Progress */}
          {goalEnabled && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" role="progressbar" aria-label="Writing goal progress">
              <div
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
                aria-valuenow={Math.min(progress, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Floating Stats */}
          <div className="absolute top-2 right-2 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 p-1 rounded-md bg-background/50 backdrop-blur-sm border text-xs">
            {customLayout.showWordCount && (
              <span className="whitespace-nowrap" role="status" aria-label="Word count">
                Words: {wordCount}
              </span>
            )}
            {customLayout.showCharCount && (
              <span className="whitespace-nowrap" role="status" aria-label="Character count">
                Chars: {charCount}
              </span>
            )}
          </div>

          {/* Editor */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start typing here..."
            className="flex-1 w-full p-2 sm:p-4 bg-background resize-none focus:outline-none"
            style={{
              fontFamily: font === 'sans' ? 'ui-sans-serif, system-ui, sans-serif' :
                font === 'serif' ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' :
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: `${fontSize}px`,
            }}
            spellCheck={spellCheck}
            aria-label="Text editor"
          />

          {/* Floating Toolbar */}
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1 p-1 rounded-lg bg-background/50 backdrop-blur-sm border shadow-lg"
            role="toolbar"
            aria-label="Editor tools"
          >
            {customLayout.showUndoRedo && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleUndo} 
                  disabled={undoStack.length === 0} 
                  className="h-8 w-8"
                  aria-label="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRedo} 
                  disabled={redoStack.length === 0} 
                  className="h-8 w-8"
                  aria-label="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowFindReplace(true)} 
              className="h-8 w-8"
              aria-label="Find and replace"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()} 
              className="h-8 w-8"
              aria-label="Upload document"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowDownloadDialog(true)} 
              className="h-8 w-8"
              aria-label="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".txt"
            className="hidden"
            aria-label="Upload file input"
          />
        </main>

        {/* Dialogs */}
        <Dialog modal open={showFindReplace} onOpenChange={(open) => {
          setShowFindReplace(open)
          if (!open) {
            setFindText('')
            setReplaceText('')
            setMatchCase(false)
            setUseRegex(false)
          }
        }}>
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Find and Replace</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="find" className="text-right">
                  Find
                </Label>
                <Input
                  id="find"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="replace" className="text-right">
                  Replace
                </Label>
                <Input
                  id="replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="match-case"
                  checked={matchCase}
                  onCheckedChange={setMatchCase}
                />
                <Label htmlFor="match-case">Match case</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-regex"
                  checked={useRegex}
                  onCheckedChange={setUseRegex}
                />
                <Label htmlFor="use-regex">Use regular expression</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFindReplace(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleFindReplace(false)}>Replace</Button>
              <Button onClick={() => handleFindReplace(true)}>Replace All</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog modal open={showDownloadDialog} onOpenChange={(open) => {
          setShowDownloadDialog(open)
          if (!open) {
            setFileName('')
          }
        }}>
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Download File</DialogTitle>
              <DialogDescription>Enter a name for your file</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="filename" className="text-right">
                  File name
                </Label>
                <Input
                  id="filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDownload} disabled={!fileName.trim()}>
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}