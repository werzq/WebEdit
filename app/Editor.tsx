'use client'

import { useState, useEffect, useRef } from 'react'
import { Moon, Sun, Save, Expand, Minimize, NotebookPen, Undo, Redo, Upload } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export default function EnhancedMinimalTextEditor() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [font, setFont] = useState('sans')
  const [fontSize, setFontSize] = useState(16)
  const [text, setText] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.className = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const handleSave = async () => {
    const { value: fileName } = await MySwal.fire({
      title: 'Enter file name',
      input: 'text',
      inputLabel: 'File name (without extension)',
      inputPlaceholder: 'Enter your file name here',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!'
        }
      }
    })

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

      MySwal.fire({
        icon: 'success',
        title: 'Saved!',
        text: `Your file ${fileName}.txt has been saved.`,
        timer: 2000,
        timerProgressBar: true,
      })
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const handleTextChange = (newText: string) => {
    setUndoStack([...undoStack, text])
    setRedoStack([])
    setText(newText)
  }

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousText = undoStack.pop()!
      setRedoStack([text, ...redoStack])
      setText(previousText)
      setUndoStack([...undoStack])
    }
  }

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextText = redoStack.shift()!
      setUndoStack([...undoStack, text])
      setText(nextText)
      setRedoStack([...redoStack])
    }
  }

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        handleTextChange(content)
        MySwal.fire({
          icon: 'success',
          title: 'File Uploaded',
          text: 'Your file has been successfully loaded.',
          timer: 2000,
          timerProgressBar: true,
        })
      }
      reader.readAsText(file)
    }
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const charCount = text.length

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 ${theme}`}>
      <div className="max-w-4xl mx-auto p-4 flex flex-col h-screen">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <NotebookPen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">WebEdit</h1>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
            <Select value={font} onValueChange={(value: string) => setFont(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Slider
                min={12}
                max={24}
                step={1}
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                className="w-[100px]"
              />
              <span className="text-sm w-8">{fontSize}px</span>
            </div>
          </div>
        </header>
        
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Start typing here..."
          className="flex-grow text-base w-full p-4 rounded-md border border-input bg-background shadow-sm focus:border-primary resize-none"
          style={{
            fontFamily: font === 'sans' ? 'ui-sans-serif, system-ui, sans-serif' :
                        font === 'serif' ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' :
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: `${fontSize}px`
          }}
        />
        
        <footer className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={handleUndo} disabled={undoStack.length === 0}>
              <Undo className="h-4 w-4" />
              <span className="sr-only">Undo</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleRedo} disabled={redoStack.length === 0}>
              <Redo className="h-4 w-4" />
              <span className="sr-only">Redo</span>
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              <span className="sr-only">Toggle fullscreen</span>
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Words: {wordCount}</span>
            <span className="text-sm text-muted-foreground">Characters: {charCount}</span>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              accept=".txt"
              style={{ display: 'none' }}
            />
          </div>
        </footer>
      </div>
    </div>
  )
}