// import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactionExists = transactionRepository.findOne({
      where: { id },
    });

    if (!transactionExists) {
      throw new AppError('Transaction not found!', 400);
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
