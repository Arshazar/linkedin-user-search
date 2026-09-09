import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SearchUsersDto } from './dto/search-users.dto';
import { SearchUsersResponse } from './dto/user-response.dto';
import { User } from '../database/entities/user.entity';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async searchUsers(
    @Query() query: SearchUsersDto,
  ): Promise<SearchUsersResponse> {
    return this.usersService.search(query);
  }

  @Get(':id')
  async getUserById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<User> {
    return this.usersService.findById(id);
  }
}
