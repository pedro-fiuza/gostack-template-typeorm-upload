import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('The type is invalid!', 400);
    }

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('You dont have enough balance!', 400);
    }

    let categoryManagement = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryManagement) {
      categoryManagement = await categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(categoryManagement);
    }

    const transaction = await transactionRepository.create({
      title,
      value,
      type,
      category_id: categoryManagement.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
