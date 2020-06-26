import fs from 'fs';
import path from 'path';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import importConfig from '../config/import';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

// import Transaction from '../models/Transaction';
interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const importTransactionPath = path.join(importConfig.directory, filename);
    const readCSVStream = fs.createReadStream(importTransactionPath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCsv = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCsv.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) => cell);

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCsv.on('end', resolve);
    });

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategory = categories
      .filter(category => !existentTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoryRepository.create(
      addCategory.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const newTransactions = await transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(importTransactionPath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
