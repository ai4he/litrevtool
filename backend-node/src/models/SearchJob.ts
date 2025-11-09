import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface PrismaMetrics {
  identification: {
    records_identified: number;
  };
  screening: {
    records_excluded_duplicates: number;
    records_after_duplicates_removed: number;
  };
  eligibility: {
    full_text_assessed: number;
    full_text_excluded_semantic: number;
  };
  included: {
    studies_included: number;
  };
}

interface SearchJobAttributes {
  id: string;
  userId: string;
  name: string;
  keywordsInclude: string[];
  keywordsExclude: string[];
  semanticCriteria?: any;
  semanticBatchMode: boolean;
  generateLatex: boolean;
  startYear?: number;
  endYear?: number;
  maxResults?: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  statusMessage?: string;
  progress: number;
  totalPapersFound: number;
  papersProcessed: number;
  lastCheckpoint?: any;
  errorMessage?: string;
  retryCount: number;
  celeryTaskId?: string;
  csvFilePath?: string;
  prismaDiagramPath?: string;
  latexFilePath?: string;
  bibtexFilePath?: string;
  prismaMetrics?: PrismaMetrics;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface SearchJobCreationAttributes
  extends Optional<
    SearchJobAttributes,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'progress'
    | 'totalPapersFound'
    | 'papersProcessed'
    | 'retryCount'
    | 'semanticBatchMode'
    | 'generateLatex'
  > {}

export class SearchJob
  extends Model<SearchJobAttributes, SearchJobCreationAttributes>
  implements SearchJobAttributes
{
  public id!: string;
  public userId!: string;
  public name!: string;
  public keywordsInclude!: string[];
  public keywordsExclude!: string[];
  public semanticCriteria?: any;
  public semanticBatchMode!: boolean;
  public generateLatex!: boolean;
  public startYear?: number;
  public endYear?: number;
  public maxResults?: number;
  public status!: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  public statusMessage?: string;
  public progress!: number;
  public totalPapersFound!: number;
  public papersProcessed!: number;
  public lastCheckpoint?: any;
  public errorMessage?: string;
  public retryCount!: number;
  public celeryTaskId?: string;
  public csvFilePath?: string;
  public prismaDiagramPath?: string;
  public latexFilePath?: string;
  public bibtexFilePath?: string;
  public prismaMetrics?: PrismaMetrics;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public startedAt?: Date;
  public completedAt?: Date;
}

// Add toJSON method to convert camelCase to snake_case for API responses
SearchJob.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());

  return {
    id: values.id,
    user_id: values.userId,
    name: values.name,
    keywords_include: values.keywordsInclude,
    keywords_exclude: values.keywordsExclude,
    semantic_criteria: values.semanticCriteria,
    semantic_batch_mode: values.semanticBatchMode,
    generate_latex: values.generateLatex,
    start_year: values.startYear,
    end_year: values.endYear,
    max_results: values.maxResults,
    status: values.status,
    status_message: values.statusMessage,
    progress: values.progress,
    total_papers_found: values.totalPapersFound,
    papers_processed: values.papersProcessed,
    last_checkpoint: values.lastCheckpoint,
    error_message: values.errorMessage,
    retry_count: values.retryCount,
    celery_task_id: values.celeryTaskId,
    csv_file_path: values.csvFilePath,
    prisma_diagram_path: values.prismaDiagramPath,
    latex_file_path: values.latexFilePath,
    bibtex_file_path: values.bibtexFilePath,
    prisma_metrics: values.prismaMetrics,
    created_at: values.createdAt,
    updated_at: values.updatedAt,
    started_at: values.startedAt,
    completed_at: values.completedAt,
  };
};

SearchJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    keywordsInclude: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'keywords_include',
    },
    keywordsExclude: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'keywords_exclude',
    },
    semanticCriteria: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'semantic_criteria',
    },
    semanticBatchMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'semantic_batch_mode',
    },
    generateLatex: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'generate_latex',
    },
    startYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'start_year',
    },
    endYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'end_year',
    },
    maxResults: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_results',
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    statusMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'status_message',
    },
    progress: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    totalPapersFound: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_papers_found',
    },
    papersProcessed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'papers_processed',
    },
    lastCheckpoint: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'last_checkpoint',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count',
    },
    celeryTaskId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'celery_task_id',
    },
    csvFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'csv_file_path',
    },
    prismaDiagramPath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'prisma_diagram_path',
    },
    latexFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'latex_file_path',
    },
    bibtexFilePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'bibtex_file_path',
    },
    prismaMetrics: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'prisma_metrics',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  },
  {
    sequelize,
    tableName: 'search_jobs',
    timestamps: true,
    underscored: true,
  }
);
