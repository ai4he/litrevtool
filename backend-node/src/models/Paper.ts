import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface PaperAttributes {
  id: string;
  searchJobId: string;
  title: string;
  authors?: string;
  year?: number;
  abstract?: string;
  source?: string;
  citations: number;
  url?: string;
  doi?: string;
  keywords?: string[];
  publisher?: string;
  semanticScore?: number;
  isExcluded: boolean;
  exclusionReason?: string;
  semanticRationale?: string;
  createdAt: Date;
}

interface PaperCreationAttributes
  extends Optional<PaperAttributes, 'id' | 'createdAt' | 'citations' | 'isExcluded'> {}

export class Paper extends Model<PaperAttributes, PaperCreationAttributes> implements PaperAttributes {
  public id!: string;
  public searchJobId!: string;
  public title!: string;
  public authors?: string;
  public year?: number;
  public abstract?: string;
  public source?: string;
  public citations!: number;
  public url?: string;
  public doi?: string;
  public keywords?: string[];
  public publisher?: string;
  public semanticScore?: number;
  public isExcluded!: boolean;
  public exclusionReason?: string;
  public semanticRationale?: string;
  public readonly createdAt!: Date;
}

// Add toJSON method to convert camelCase to snake_case for API responses
Paper.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());

  return {
    id: values.id,
    search_job_id: values.searchJobId,
    title: values.title,
    authors: values.authors,
    year: values.year,
    abstract: values.abstract,
    source: values.source,
    citations: values.citations,
    url: values.url,
    doi: values.doi,
    keywords: values.keywords,
    publisher: values.publisher,
    semantic_score: values.semanticScore,
    is_excluded: values.isExcluded,
    exclusion_reason: values.exclusionReason,
    semantic_rationale: values.semanticRationale,
    created_at: values.createdAt,
  };
};

Paper.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    searchJobId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'search_job_id',
      references: {
        model: 'search_jobs',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    authors: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    abstract: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    citations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    doi: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    publisher: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    semanticScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'semantic_score',
    },
    isExcluded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_excluded',
    },
    exclusionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'exclusion_reason',
    },
    semanticRationale: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'semantic_rationale',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'papers',
    timestamps: false,
    underscored: true,
  }
);
