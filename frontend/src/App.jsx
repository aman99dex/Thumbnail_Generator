import { useState, useRef, useEffect } from 'react'
import { uploadHeadshot, createjob, subscribeToJob } from './api.js'
import './App.css'

function App() {
  const [stage, setStage] = useState('input')
  const [file, setFile] = useState(null)
  const [headshotPreview, setHeadshotPreview] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [numThumbnails, setNumThumbnails] = useState(2)
  const [thumbnails, setThumbnails] = useState([])
  const [totalThumbnails, setTotalThumbnails] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const esRef = useRef(null)

  useEffect(() => {
    return () => esRef.current?.close()
  }, [])

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setHeadshotPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { url: headshotUrl } = await uploadHeadshot(file)
      const { job_id } = await createjob({ prompt, numThumbnails, headshotUrl })
      setTotalThumbnails(numThumbnails)
      setThumbnails([])
      setStage('generating')

      esRef.current = subscribeToJob(job_id, {
        onThumbnailReady: (data) => {
          setThumbnails(prev => [...prev, { ...data, status: 'ready' }])
        },
        onThumbnailFailed: (data) => {
          setThumbnails(prev => [...prev, { ...data, status: 'failed' }])
        },
        onJobComplete: () => {
          setStage('done')
        },
        OnError: () => {
          setError('Connection error. Some thumbnails may still be generating.')
          setStage('done')
        },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    esRef.current?.close()
    setStage('input')
    setFile(null)
    setHeadshotPreview(null)
    setPrompt('')
    setNumThumbnails(2)
    setThumbnails([])
    setTotalThumbnails(0)
    setError(null)
  }

  const canSubmit = file && prompt.trim() && !loading

  return (
    <div className="app">
      <header className="header">
        <h1>Thumbnail Maker</h1>
        <p>AI-generated YouTube thumbnails featuring you</p>
      </header>

      {stage === 'input' && (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Your Headshot</label>
            <label className="upload-zone">
              {headshotPreview
                ? <img src={headshotPreview} className="preview-img" alt="Headshot preview" />
                : <span className="upload-placeholder">Click to upload photo</span>
              }
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden-input"
              />
            </label>
          </div>

          <div className="field">
            <label className="label">Video Description</label>
            <textarea
              className="textarea"
              placeholder="Describe your video (e.g. 'I built a SaaS in 24 hours')"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="field">
            <label className="label">Number of Thumbnails</label>
            <div className="pill-group">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`pill ${numThumbnails === n ? 'pill-active' : ''}`}
                  onClick={() => setNumThumbnails(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="submit-btn" disabled={!canSubmit}>
            {loading ? <span className="spinner" /> : 'Generate Thumbnails'}
          </button>
        </form>
      )}

      {(stage === 'generating' || stage === 'done') && (
        <div className="results">
          <div className="results-header">
            <div>
              <h2>
                {stage === 'generating'
                  ? `Generating... ${thumbnails.length}/${totalThumbnails}`
                  : `Done — ${thumbnails.filter(t => t.status === 'ready').length} thumbnail${thumbnails.filter(t => t.status === 'ready').length !== 1 ? 's' : ''} ready`
                }
              </h2>
              {stage === 'generating' && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(thumbnails.length / totalThumbnails) * 100}%` }}
                  />
                </div>
              )}
            </div>
            {stage === 'done' && (
              <button className="reset-btn" onClick={handleReset}>Start Over</button>
            )}
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="thumbnail-grid">
            {thumbnails.map((t, i) => (
              <div key={t.id ?? i} className={`thumb-card ${t.status === 'failed' ? 'thumb-card-failed' : ''}`}>
                {t.status === 'ready'
                  ? <>
                      <img src={t.variants?.youtube ?? t.imagekit_url} className="thumb-img" alt={t.style_name} />
                      <div className="thumb-meta">
                        <span className="style-badge">{t.style_name?.replace(/_/g, ' ')}</span>
                        <div className="variant-links">
                          <a href={t.variants?.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
                          <a href={t.variants?.shorts} target="_blank" rel="noopener noreferrer">Shorts</a>
                          <a href={t.variants?.square} target="_blank" rel="noopener noreferrer">Square</a>
                        </div>
                      </div>
                    </>
                  : <div className="thumb-error">
                      <span>Failed to generate</span>
                      {t.error && <small>{t.error}</small>}
                    </div>
                }
              </div>
            ))}

            {stage === 'generating' && Array.from({ length: totalThumbnails - thumbnails.length }).map((_, i) => (
              <div key={`placeholder-${i}`} className="thumb-card thumb-placeholder">
                <div className="placeholder-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
