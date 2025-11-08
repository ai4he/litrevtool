import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobsAPI } from '../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import CreateJobDialog from './CreateJobDialog';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState(null);
  const [jobPapers, setJobPapers] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const [screenshots, setScreenshots] = useState({});

  useEffect(() => {
    fetchJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.listJobs();
      setJobs(response.data.jobs);
      setError(null);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (jobData) => {
    try {
      await jobsAPI.createJob(jobData);
      setOpenDialog(false);
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
      setError('Failed to create job');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.deleteJob(jobId);
        fetchJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
        setError('Failed to delete job');
      }
    }
  };

  const handlePauseJob = async (jobId) => {
    try {
      await jobsAPI.pauseJob(jobId);
      fetchJobs();
    } catch (error) {
      console.error('Error pausing job:', error);
      setError('Failed to pause job');
    }
  };

  const handleResumeJob = async (jobId) => {
    try {
      await jobsAPI.resumeJob(jobId);
      fetchJobs();
    } catch (error) {
      console.error('Error resuming job:', error);
      setError('Failed to resume job');
    }
  };

  const handleDownload = async (jobId, jobName) => {
    try {
      const response = await jobsAPI.downloadResults(jobId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading results:', error);
      setError('Failed to download results');
    }
  };

  const handleDownloadPrismaDiagram = async (jobId, jobName) => {
    try {
      const response = await jobsAPI.downloadPrismaDiagram(jobId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/svg+xml' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobName.replace(/\s+/g, '_')}_PRISMA.svg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PRISMA diagram:', error);
      setError('Failed to download PRISMA diagram');
    }
  };

  const handleDownloadLatex = async (jobId, jobName) => {
    try {
      const response = await jobsAPI.downloadLatex(jobId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/x-tex' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobName.replace(/\s+/g, '_')}_Review.tex`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading LaTeX:', error);
      setError('Failed to download LaTeX document');
    }
  };

  const handleDownloadBibtex = async (jobId, jobName) => {
    try {
      const response = await jobsAPI.downloadBibtex(jobId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/x-bibtex' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobName.replace(/\s+/g, '_')}_References.bib`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading BibTeX:', error);
      setError('Failed to download BibTeX file');
    }
  };

  const fetchPapers = useCallback(async (jobId) => {
    try {
      const response = await jobsAPI.getPapers(jobId);
      setJobPapers(prev => ({ ...prev, [jobId]: response.data.papers }));
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  }, []);

  const fetchScreenshot = useCallback(async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(jobsAPI.getScreenshot(jobId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setScreenshots(prev => {
          // Revoke old URL if it exists to prevent memory leak
          if (prev[jobId]) {
            URL.revokeObjectURL(prev[jobId]);
          }
          return { ...prev, [jobId]: imageUrl };
        });
      }
    } catch (error) {
      console.error('Error fetching screenshot:', error);
    }
  }, []);

  const toggleExpanded = (jobId) => {
    const isExpanding = !expandedJobs[jobId];
    setExpandedJobs(prev => ({ ...prev, [jobId]: isExpanding }));

    // Fetch papers when expanding if not already loaded
    if (isExpanding && !jobPapers[jobId]) {
      fetchPapers(jobId);
    }
  };

  // Fetch papers for running/completed jobs automatically
  useEffect(() => {
    jobs.forEach(job => {
      // Always fetch papers for running and completed jobs
      if (job.status === 'running' || job.status === 'completed') {
        const cachedPapers = jobPapers[job.id];
        const shouldFetch = !cachedPapers ||
                          (job.total_papers_found && cachedPapers.length < job.total_papers_found);

        if (shouldFetch) {
          fetchPapers(job.id);
        }
      }
    });
  }, [jobs, fetchPapers, jobPapers]);

  // Fetch screenshots for running jobs
  useEffect(() => {
    jobs.forEach(job => {
      if (job.status === 'running') {
        fetchScreenshot(job.id);
      }
    });
  }, [jobs, fetchScreenshot]);

  // Auto-expand completed jobs with papers
  useEffect(() => {
    jobs.forEach(job => {
      if (job.status === 'completed' && job.total_papers_found > 0) {
        // Only auto-expand if not already explicitly collapsed by user
        if (expandedJobs[job.id] === undefined) {
          setExpandedJobs(prev => ({ ...prev, [job.id]: true }));
        }
      }
    });
  }, [jobs, expandedJobs]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      running: 'primary',
      completed: 'success',
      failed: 'error',
      paused: 'warning',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Dashboard</Typography>
          <Box>
            <Button
              variant="outlined"
              sx={{ mr: 2 }}
              onClick={handleLogout}
            >
              Logout
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              New Search
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          Welcome, {user?.name || user?.email}
        </Typography>

        <Grid container spacing={3}>
          {jobs.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No searches yet
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Create your first search to extract papers from Google Scholar
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenDialog(true)}
                >
                  Create First Search
                </Button>
              </Paper>
            </Grid>
          ) : (
            jobs.map((job) => (
              <Grid item xs={12} md={6} key={job.id}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {job.name}
                    </Typography>
                    <Chip
                      label={job.status}
                      color={getStatusColor(job.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Keywords: {job.keywords_include.join(', ')}
                  </Typography>

                  {(job.start_year || job.end_year) && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Years: {job.start_year || '?'} - {job.end_year || '?'}
                    </Typography>
                  )}

                  {job.status === 'running' && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Progress: {job.papers_processed} / {job.total_papers_found || '?'} papers
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {job.progress.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={job.progress}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                          }
                        }}
                      />

                      {/* Current Activity */}
                      {job.last_checkpoint && (
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                          <Typography variant="caption" color="primary" fontWeight="bold">
                            🔍 Currently Processing:
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {job.last_checkpoint.last_year_completed
                              ? `Year ${parseInt(job.last_checkpoint.last_year_completed) + 1}`
                              : 'Initializing...'}
                          </Typography>
                          {job.last_checkpoint.papers_collected && (
                            <Typography variant="caption" color="textSecondary">
                              📄 {job.last_checkpoint.papers_collected} papers collected so far
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Time Estimation */}
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="textSecondary">
                          ⏱️ Started: {job.started_at ? new Date(job.started_at).toLocaleTimeString() : 'N/A'}
                        </Typography>
                        {job.progress > 0 && job.started_at && (
                          <Typography variant="caption" color="textSecondary">
                            ⏳ Est. remaining: {(() => {
                              const elapsed = Date.now() - new Date(job.started_at).getTime();
                              const rate = job.progress / elapsed;
                              const remaining = (100 - job.progress) / rate;
                              const minutes = Math.floor(remaining / 60000);
                              const seconds = Math.floor((remaining % 60000) / 1000);
                              return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                            })()}
                          </Typography>
                        )}
                      </Box>

                      {/* Real-time Status Message */}
                      {job.status_message && (
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1, border: '1px solid', borderColor: 'primary.light' }}>
                          <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
                            🔄 Current Status
                          </Typography>
                          <Typography variant="body2" color="textPrimary">
                            {job.status_message}
                          </Typography>
                        </Box>
                      )}

                      {/* Browser Screenshot */}
                      <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                          📸 Live Browser View
                        </Typography>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            paddingTop: '56.25%', // 16:9 aspect ratio
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: 1,
                            overflow: 'hidden',
                          }}
                        >
                          {screenshots[job.id] ? (
                            <img
                              src={screenshots[job.id]}
                              alt="Browser screenshot"
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography variant="caption" color="textSecondary">
                                No screenshot available yet...
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Live Papers Display for Running Jobs */}
                      <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                          📄 Papers Collected ({jobPapers[job.id]?.length || 0} papers)
                        </Typography>
                        {jobPapers[job.id] && jobPapers[job.id].length > 0 ? (
                          <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', mt: 1 }}>
                            {jobPapers[job.id].slice(0, 10).map((paper, index) => (
                              <React.Fragment key={paper.id}>
                                {index > 0 && <Divider />}
                                <ListItem alignItems="flex-start" sx={{ py: 0.5 }}>
                                  <ListItemText
                                    primary={
                                      <Typography variant="caption" fontWeight="bold">
                                        {index + 1}. {paper.title}
                                      </Typography>
                                    }
                                    secondary={
                                      <Box component="span">
                                        <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                          {paper.authors && `${paper.authors.substring(0, 80)}${paper.authors.length > 80 ? '...' : ''}`}
                                          {paper.year && ` • ${paper.year}`}
                                          {paper.citations !== null && paper.citations !== undefined && ` • Cited: ${paper.citations}`}
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                </ListItem>
                              </React.Fragment>
                            ))}
                            {jobPapers[job.id].length > 10 && (
                              <ListItem sx={{ py: 0.5, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                                <ListItemText
                                  primary={
                                    <Typography variant="caption" color="textSecondary" align="center">
                                      ... and {jobPapers[job.id].length - 10} more papers
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            )}
                          </List>
                        ) : (
                          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                            {job.papers_processed > 0 ? (
                              <>
                                Collecting papers... {job.papers_processed} found so far
                                <br />
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                  Papers are loading...
                                </Typography>
                              </>
                            ) : (
                              'Initializing search...'
                            )}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {job.status === 'completed' && (
                    <>
                      <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                        Found {job.total_papers_found} papers
                      </Typography>

                      {/* PRISMA Metrics */}
                      {job.prisma_metrics && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(76, 175, 80, 0.08)', borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                          <Typography variant="caption" color="success.main" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                            📊 PRISMA Methodology Metrics
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Identified:</strong> {job.prisma_metrics.identification.records_identified} records
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Duplicates Removed:</strong> {job.prisma_metrics.screening.records_excluded_duplicates}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              <strong>After Deduplication:</strong> {job.prisma_metrics.screening.records_after_duplicates_removed}
                            </Typography>
                            {job.prisma_metrics.eligibility.full_text_assessed > 0 && (
                              <>
                                <Typography variant="caption" color="textSecondary">
                                  <strong>Semantic Assessed:</strong> {job.prisma_metrics.eligibility.full_text_assessed}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  <strong>Semantic Excluded:</strong> {job.prisma_metrics.eligibility.full_text_excluded_semantic}
                                </Typography>
                              </>
                            )}
                            <Typography variant="caption" color="success.main" fontWeight="bold" sx={{ mt: 0.5 }}>
                              <strong>Final Included:</strong> {job.prisma_metrics.included.studies_included} papers
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </>
                  )}

                  {job.status === 'paused' && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {job.status_message || 'Job is paused. Click Resume to continue from where it left off.'}
                    </Alert>
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {job.error_message}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    {job.status === 'running' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<PauseIcon />}
                        onClick={() => handlePauseJob(job.id)}
                      >
                        Pause
                      </Button>
                    )}

                    {job.status === 'completed' && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(job.id, job.name)}
                        >
                          Download CSV
                        </Button>
                        {job.prisma_diagram_path && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadPrismaDiagram(job.id, job.name)}
                            sx={{ borderColor: 'success.main', color: 'success.main', '&:hover': { borderColor: 'success.dark', bgcolor: 'success.light' } }}
                          >
                            PRISMA Diagram
                          </Button>
                        )}
                        {job.latex_file_path && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadLatex(job.id, job.name)}
                            sx={{ borderColor: 'info.main', color: 'info.main', '&:hover': { borderColor: 'info.dark', bgcolor: 'info.light' } }}
                          >
                            LaTeX
                          </Button>
                        )}
                        {job.bibtex_file_path && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadBibtex(job.id, job.name)}
                            sx={{ borderColor: 'info.main', color: 'info.main', '&:hover': { borderColor: 'info.dark', bgcolor: 'info.light' } }}
                          >
                            BibTeX
                          </Button>
                        )}
                      </>
                    )}

                    {(job.status === 'failed' || job.status === 'paused') && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleResumeJob(job.id)}
                      >
                        Resume
                      </Button>
                    )}

                    {(job.status === 'running' || job.status === 'completed') && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={expandedJobs[job.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => toggleExpanded(job.id)}
                      >
                        {expandedJobs[job.id] ? 'Hide' : 'Show'} Papers ({jobPapers[job.id]?.length || 0})
                      </Button>
                    )}

                    <IconButton
                      size="small"
                      onClick={fetchJobs}
                      title="Refresh"
                    >
                      <RefreshIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteJob(job.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {/* Papers List */}
                  <Collapse in={expandedJobs[job.id]} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        Extracted Papers
                      </Typography>
                      {jobPapers[job.id] && jobPapers[job.id].length > 0 ? (
                        <List dense sx={{ maxHeight: 400, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          {jobPapers[job.id].map((paper, index) => (
                            <React.Fragment key={paper.id}>
                              {index > 0 && <Divider />}
                              <ListItem alignItems="flex-start">
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" fontWeight="bold">
                                      {index + 1}. {paper.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box component="span">
                                      {paper.authors && (
                                        <Typography variant="caption" display="block" color="textSecondary">
                                          {paper.authors}
                                        </Typography>
                                      )}
                                      {(paper.year || paper.source) && (
                                        <Typography variant="caption" display="block" color="textSecondary">
                                          {paper.year && `${paper.year}`}
                                          {paper.year && paper.source && ' • '}
                                          {paper.source}
                                        </Typography>
                                      )}
                                      {paper.citations !== null && paper.citations !== undefined && (
                                        <Typography variant="caption" display="block" color="primary">
                                          Cited by: {paper.citations}
                                        </Typography>
                                      )}
                                      {paper.url && (
                                        <Typography variant="caption" display="block">
                                          <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                            🔗 Link
                                          </a>
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="textSecondary" align="center" sx={{ p: 2 }}>
                          No papers extracted yet
                        </Typography>
                      )}
                    </Box>
                  </Collapse>

                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Created: {new Date(job.created_at).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      <CreateJobDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={handleCreateJob}
      />
    </Container>
  );
}

export default Dashboard;
